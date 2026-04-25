import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
	confirmAppointmentAsProvider,
	cancelAppointmentAsProvider,
	completeWalkerAppointmentAsProvider,
	completeVetClinicAppointmentAsProvider
} from '../services/appointments';
import {
	blockAgendaSlot,
	clearOmittedAgendaSlots,
	deleteAgendaSlot,
	generateAgendaSlots,
	listMyAgendaSlots,
	unblockAgendaSlot
} from '../services/agenda';
import { listClinicServices, createClinicService } from '../services/clinicServices';
import { fetchProviderBookings } from '../services/bookings';
import {
	createReviewForAppointment,
	fetchReviewEligibility,
	updateMyReview
} from '../services/reviews';
import { formatChileDateTimeRange } from '../constants/chileTime';
import { hasRole } from '../lib/userRoles';
import {
	ProviderClinicCalendar,
	mapBookingToCalEvent,
	mapAgendaSlotToCalEvent,
	filterBookingsForCalendar
} from '../components/ProviderClinicCalendar';

const APPOINTMENT_STATUS_LABELS = {
	pending_confirmation: 'Pendiente de confirmación',
	confirmed: 'Confirmada',
	cancelled_by_owner: 'Cancelada (dueño)',
	cancelled_by_provider: 'Cancelada (proveedor)',
	completed: 'Completada',
	no_show: 'No asistió'
};

const BOOKING_SOURCE_LABELS = {
	availability_slot: 'Agenda',
	walker_request: 'Solicitud paseo/cuidado'
};

function formatRange(startAt, endAt) {
	return formatChileDateTimeRange(startAt, endAt);
}

function ownerLabel(o) {
	if (!o) return '—';
	return `${o.name || ''} ${o.lastName || ''}`.trim() || 'Dueño';
}

function toYmdLocal(d) {
	const p = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function buildSlotsListParams(agFrom, agTo) {
	const f = agFrom && String(agFrom).trim() ? String(agFrom).trim() : '';
	const t = agTo && String(agTo).trim() ? String(agTo).trim() : '';
	/** Sólo bloques que aun no comenzaron, salvo rango; el backend aplica días en zona Chile. */
	const p = { onlyFuture: '1' };
	if (f || t) {
		p.fromYmd = f || t;
		p.toYmd = t || f;
	}
	return p;
}

/**
 * @param {Record<string, any>} s agenda slot
 * @returns {string} id de línea de atención (clinic service)
 */
function getSlotClinicServiceId(s) {
	const c = s && s.clinicServiceId;
	if (c == null) return '';
	if (typeof c === 'string') return c;
	if (typeof c === 'object') {
		if (c._id != null) return String(c._id);
		if (c.id != null) return String(c.id);
	}
	return '';
}

export function ProviderDashboardPage() {
	const { user, loading: authLoading } = useAuth();
	const [bookings, setBookings] = useState([]);
	const [slots, setSlots] = useState([]);
	const [loadingBookings, setLoadingBookings] = useState(true);
	const [loadingSlots, setLoadingSlots] = useState(true);
	const [error, setError] = useState('');
	/** Rango solo para "Permitir otra vez" (vaciar recuerdo de tramos eliminados a mano) */
	const [omitsFrom, setOmitsFrom] = useState(() => toYmdLocal(new Date()));
	const [omitsTo, setOmitsTo] = useState(() => {
		const d = new Date();
		d.setDate(d.getDate() + 56);
		return toYmdLocal(d);
	});
	const [agendaMsg, setAgendaMsg] = useState('');
	const [agendaError, setAgendaError] = useState('');
	const [bookingActionMsg, setBookingActionMsg] = useState('');
	const [bookingActionErr, setBookingActionErr] = useState('');
	const [clientReviewRow, setClientReviewRow] = useState(null);
	const [provElig, setProvElig] = useState(null);
	const [provEligLoading, setProvEligLoading] = useState(false);
	const [provEligErr, setProvEligErr] = useState('');
	const [provForm, setProvForm] = useState({ rating: 5, comment: '' });
	const [provSubmit, setProvSubmit] = useState(false);
	const [provMsg, setProvMsg] = useState('');
	const [clinicLines, setClinicLines] = useState([]);
	const [newLineName, setNewLineName] = useState('');
	const [newLineMins, setNewLineMins] = useState(30);
	const [newLinePrice, setNewLinePrice] = useState('');
	const [clinicLineMsg, setClinicLineMsg] = useState('');
	const didAutoAgenda = useRef(false);
	/** Pestañas de agenda: reservas vs tramos a la venta (solo clínica). */
	const [vetAgendaTab, setVetAgendaTab] = useState(/** @type {'citas' | 'oferta'} */ ('citas'));
	/** Filtro de línea en pestaña oferta: '' = todas. */
	const [ofertaLineFilter, setOfertaLineFilter] = useState('');

	const calendarEvents = useMemo(() => {
		return (Array.isArray(bookings) ? bookings : [])
			.filter(filterBookingsForCalendar)
			.map((row) => mapBookingToCalEvent(row, ownerLabel));
	}, [bookings]);

	const filteredOfertaSlots = useMemo(() => {
		if (user?.providerType !== 'veterinaria') return [];
		const list = Array.isArray(slots) ? slots : [];
		if (!ofertaLineFilter) return list;
		const want = String(ofertaLineFilter);
		return list.filter((s) => getSlotClinicServiceId(s) === want);
	}, [slots, ofertaLineFilter, user?.providerType]);

	/** Tramos ofrecidos para el calendario (misma franja que citas, sin mezclar). */
	const ofertaCalEvents = useMemo(() => {
		return filteredOfertaSlots
			.map((s) => mapAgendaSlotToCalEvent(s))
			.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
	}, [filteredOfertaSlots]);

	/** Añade tramos en el rango; por defecto desde hoy unas 8 semanas. */
	const fillAgendaRange = useCallback(
		/** @param {number} weekCount */
		async (weekCount = 8) => {
			const from = toYmdLocal(new Date());
			const t = new Date();
			t.setDate(t.getDate() + 7 * weekCount);
			const toD = toYmdLocal(t);
			return generateAgendaSlots({ fromDate: from, toDate: toD });
		},
		[]
	);

	const reloadBookings = useCallback(async () => {
		const b = await fetchProviderBookings();
		setBookings(Array.isArray(b.items) ? b.items : []);
	}, []);

	useEffect(() => {
		if (authLoading || !user || !hasRole(user, 'proveedor')) return;
		const c = new AbortController();
		(async () => {
			try {
				setLoadingBookings(true);
				setError('');
				const b = await fetchProviderBookings(c.signal);
				setBookings(Array.isArray(b.items) ? b.items : []);
			} catch (err) {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setError(err.response?.data?.message || 'No se pudieron cargar las reservas.');
			} finally {
				setLoadingBookings(false);
			}
		})();
		return () => c.abort();
	}, [authLoading, user]);

	useEffect(() => {
		if (authLoading || !user || !hasRole(user, 'proveedor')) return;
		if (user?.providerType !== 'veterinaria') {
			setSlots([]);
			setLoadingSlots(false);
			return;
		}
		const c = new AbortController();
		(async () => {
			try {
				setLoadingSlots(true);
				const s = await listMyAgendaSlots(c.signal, buildSlotsListParams('', ''));
				setSlots(Array.isArray(s.slots) ? s.slots : []);
			} catch {
				setSlots([]);
			} finally {
				setLoadingSlots(false);
			}
		})();
		return () => c.abort();
	}, [authLoading, user]);

	useEffect(() => {
		const isProv = hasRole(user, 'proveedor');
		const kind = user?.providerType;
		if (authLoading || !user || !isProv || !['veterinaria', 'paseador', 'cuidador'].includes(kind)) return;
		const c = new AbortController();
		(async () => {
			try {
				const d = await listClinicServices(c.signal);
				setClinicLines(Array.isArray(d.items) ? d.items : []);
			} catch {
				setClinicLines([]);
			}
		})();
		return () => c.abort();
	}, [authLoading, user]);

	useEffect(() => {
		if (!clientReviewRow || clientReviewRow.kind !== 'appointment') {
			setProvElig(null);
			return;
		}
		const id = String(clientReviewRow.id ?? clientReviewRow._id ?? '');
		if (!id) {
			setProvElig(null);
			return;
		}
		const c = new AbortController();
		(async () => {
			setProvEligLoading(true);
			setProvEligErr('');
			try {
				const e = await fetchReviewEligibility(id, c.signal);
				setProvElig(e);
				if (e?.review) {
					setProvForm({
						rating: e.review.rating,
						comment: e.review.comment || e.review.observation || ''
					});
				} else {
					setProvForm({ rating: 5, comment: '' });
				}
			} catch (err) {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setProvEligErr(err.response?.data?.message || 'No se pudo cargar el estado de la reseña.');
				setProvElig(null);
			} finally {
				setProvEligLoading(false);
			}
		})();
		return () => c.abort();
	}, [clientReviewRow]);

	/** Rellena la bandeja de tramos (sin botón: una vez al cargar; también al añadir línea). */
	useEffect(() => {
		if (authLoading || !user || user?.providerType !== 'veterinaria' || didAutoAgenda.current) return;
		didAutoAgenda.current = true;
		let alive = true;
		(async () => {
			try {
				await fillAgendaRange(8);
			} catch {
				/* clínica nueva o aún sin líneas: omitir */
			}
			if (!alive) return;
			try {
				const s = await listMyAgendaSlots(undefined, buildSlotsListParams('', ''));
				setSlots(Array.isArray(s.slots) ? s.slots : []);
			} catch {
				if (alive) setSlots([]);
			}
		})();
		return () => {
			alive = false;
		};
		// Intencional: solo al montar el panel; no depende del filtro de fechas
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [authLoading, user, fillAgendaRange]);

	if (authLoading) {
		return (
			<div className='page'>
				<p>Cargando…</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to='/login' replace state={{ from: '/proveedor' }} />;
	}

	if (!hasRole(user, 'proveedor')) {
		return (
			<div className='page'>
				<Link className='back-link' to='/'>
					Inicio
				</Link>
				<p className='error'>Solo cuentas de servicio (veterinario, paseo o cuidado).</p>
			</div>
		);
	}

	async function onForceFillAgenda(e) {
		e.preventDefault();
		setAgendaMsg('');
		setAgendaError('');
		try {
			const res = await fillAgendaRange(8);
			let line = res.message || 'Listo. Se añadieron o completaron tramos.';
			const n = res.summary && typeof res.summary.respectedManualDeletes === 'number' ? res.summary.respectedManualDeletes : 0;
			if (n > 0) {
				line += ` (${n} tramo(s) respetan borrados a mano; ver bloque de mantenimiento).`;
			}
			setAgendaMsg(line);
			const s = await listMyAgendaSlots(undefined, buildSlotsListParams('', ''));
			setSlots(Array.isArray(s.slots) ? s.slots : []);
		} catch (err) {
			const raw = err.response?.data?.message || err.message || 'No se pudo rellenar la agenda.';
			setAgendaError(typeof raw === 'string' ? raw : 'No se pudo rellenar la agenda.');
		}
	}

	async function onAddClinicLine(e) {
		e.preventDefault();
		setClinicLineMsg('');
		const n = newLineName.trim();
		if (!n) {
			setClinicLineMsg('Escribe un nombre para la línea (ej. Consulta Dra. Pérez).');
			return;
		}
		const isVet = user?.providerType === 'veterinaria';
		const isWalker = user?.providerType === 'paseador' || user?.providerType === 'cuidador';
		const pr = isWalker ? Number(String(newLinePrice).replace(',', '.')) : null;
		if (isWalker && (Number.isNaN(pr) || pr < 0)) {
			setClinicLineMsg('Indica un precio (referencia) numérico para este servicio.');
			return;
		}
		try {
			const payload = {
				displayName: n,
				slotDurationMinutes: newLineMins
			};
			if (isWalker) payload.priceClp = pr;
			await createClinicService(payload);
			setNewLineName('');
			if (isVet) {
				try {
					await fillAgendaRange(8);
					const s = await listMyAgendaSlots(undefined, buildSlotsListParams('', ''));
					setSlots(Array.isArray(s.slots) ? s.slots : []);
				} catch {
					/* sin bloquear */
				}
			}
			setClinicLineMsg(
				isVet
					? 'Línea añadida. Los tramos de esta línea se generan en la agenda (hoy +8 sem).'
					: 'Servicio añadido.'
			);
			const d = await listClinicServices();
			setClinicLines(Array.isArray(d.items) ? d.items : []);
		} catch (err) {
			setClinicLineMsg(err.response?.data?.message || 'No se pudo crear la línea.');
		}
	}

	async function onClearOmittedAgenda(e) {
		e.preventDefault();
		setAgendaMsg('');
		setAgendaError('');
		const from = omitsFrom.trim() || toYmdLocal(new Date());
		const to = omitsTo.trim() || from;
		try {
			const res = await clearOmittedAgendaSlots({ from, to });
			const n = res.deletedCount != null ? res.deletedCount : 0;
			setAgendaMsg(
				(res && res.message) || `Listo. Se quitaron ${n} recuerdos de franjas borradas. Vuelve a generar.`
			);
		} catch (err) {
			setAgendaError(err.response?.data?.message || 'No se pudo limpiar la supresión de franjas.');
		}
	}

	async function onDeleteSlot(id) {
		if (!window.confirm('¿Eliminar este bloque disponible?')) return;
		try {
			setAgendaError('');
			await deleteAgendaSlot(id);
			const s = await listMyAgendaSlots(undefined, buildSlotsListParams('', ''));
			setSlots(Array.isArray(s.slots) ? s.slots : []);
		} catch (err) {
			setAgendaError(err.response?.data?.message || 'No se pudo eliminar.');
		}
	}

	async function onBlockSlot(id) {
		try {
			setAgendaError('');
			await blockAgendaSlot(id);
			const s = await listMyAgendaSlots(undefined, buildSlotsListParams('', ''));
			setSlots(Array.isArray(s.slots) ? s.slots : []);
		} catch (err) {
			setAgendaError(err.response?.data?.message || 'No se pudo bloquear.');
		}
	}

	async function onUnblockSlot(id) {
		try {
			setAgendaError('');
			await unblockAgendaSlot(id);
			const s = await listMyAgendaSlots(undefined, buildSlotsListParams('', ''));
			setSlots(Array.isArray(s.slots) ? s.slots : []);
		} catch (err) {
			setAgendaError(err.response?.data?.message || 'No se pudo desbloquear.');
		}
	}

	async function onConfirmBooking(row) {
		setBookingActionMsg('');
		setBookingActionErr('');
		const rawId = row.id;
		const id = rawId != null ? String(rawId) : '';
		if (!id) return;
		try {
			await confirmAppointmentAsProvider(id);
			setBookingActionMsg('Actualizado correctamente.');
			await reloadBookings();
			/* Al confirmar, refrescar bloques: el hueco no vuelve a ofrecerse (y la lista queda alineada). */
			if (user?.providerType === 'veterinaria') {
				const s = await listMyAgendaSlots(undefined, buildSlotsListParams('', ''));
				setSlots(Array.isArray(s.slots) ? s.slots : []);
			}
		} catch (err) {
			setBookingActionErr(err.response?.data?.message || 'No se pudo confirmar.');
		}
	}

	async function onCancelBooking(row) {
		setBookingActionMsg('');
		setBookingActionErr('');
		const reason = window.prompt('Motivo de la cancelación (obligatorio):');
		if (!reason || !reason.trim()) return;
		const rawId = row.id;
		const id = rawId != null ? String(rawId) : '';
		if (!id) return;
		try {
			await cancelAppointmentAsProvider(id, reason.trim());
			setBookingActionMsg('Cancelación registrada.');
			await reloadBookings();
			if (user?.providerType === 'veterinaria') {
				try {
					const s = await listMyAgendaSlots(undefined, buildSlotsListParams('', ''));
					setSlots(Array.isArray(s.slots) ? s.slots : []);
				} catch {
					/* no bloquear */
				}
			}
		} catch (err) {
			setBookingActionErr(err.response?.data?.message || 'No se pudo cancelar.');
		}
	}

	function completeBookingConfirmText(row) {
		if (row?.bookingSource === 'availability_slot') {
			return '¿Marcar la atención clínica como completada?';
		}
		return '¿Marcar este paseo o cuidado como completado?';
	}

	function completeBookingSuccessText(row) {
		return row?.bookingSource === 'availability_slot'
			? 'Atención marcada como completada.'
			: 'Servicio marcado como completado.';
	}

	async function onCompleteBooking(row) {
		if (!window.confirm(completeBookingConfirmText(row))) return;
		setBookingActionMsg('');
		setBookingActionErr('');
		const rawId = row.id;
		const id = rawId != null ? String(rawId) : '';
		if (!id) return;
		try {
			if (row.bookingSource === 'availability_slot') {
				await completeVetClinicAppointmentAsProvider(id);
			} else {
				await completeWalkerAppointmentAsProvider(id);
			}
			setBookingActionMsg(completeBookingSuccessText(row));
			await reloadBookings();
			if (user?.providerType === 'veterinaria') {
				try {
					const s = await listMyAgendaSlots(undefined, buildSlotsListParams('', ''));
					setSlots(Array.isArray(s.slots) ? s.slots : []);
				} catch {
					/* no bloquear */
				}
			}
		} catch (err) {
			setBookingActionErr(err.response?.data?.message || 'No se pudo completar.');
		}
	}

	function canConfirm(row) {
		return row.kind === 'appointment' && row.status === 'pending_confirmation';
	}

	function canCancel(row) {
		return row.kind === 'appointment' && ['pending_confirmation', 'confirmed'].includes(row.status);
	}

	function canCompleteWalker(row) {
		if (row.kind !== 'appointment' || row.bookingSource !== 'walker_request') return false;
		return ['pending_confirmation', 'confirmed'].includes(row.status);
	}

	function canCompleteVetClinicSlot(row) {
		if (row.kind !== 'appointment' || row.bookingSource !== 'availability_slot') return false;
		return ['pending_confirmation', 'confirmed'].includes(row.status);
	}

	function petIdString(row) {
		const p = row.petId;
		if (!p) return '';
		if (typeof p === 'object' && p._id) return String(p._id);
		return String(p);
	}

	const isVet = user.providerType === 'veterinaria';
	const isWalkerCare = user?.providerType === 'paseador' || user?.providerType === 'cuidador';

	function appointmentRowId(row) {
		if (!row || row.kind !== 'appointment') return '';
		return String(row.id ?? row._id ?? '');
	}

	function canProviderReviewClientRow(row) {
		if (!isWalkerCare) return false;
		if (row.kind !== 'appointment' || row.status !== 'completed') return false;
		return true;
	}
	const agendaStart = user?.providerProfile?.agendaSlotStart || '09:00';
	const agendaEnd = user?.providerProfile?.agendaSlotEnd || '18:00';

	function canRegisterClinical(row) {
		if (!isVet) return false;
		if (row.kind !== 'appointment') return false;
		if (!petIdString(row)) return false;
		return ['confirmed', 'completed'].includes(row.status);
	}

	function closeClientReviewModal() {
		setClientReviewRow(null);
		setProvMsg('');
		setProvEligErr('');
	}

	async function submitProviderToOwnerReview() {
		if (!clientReviewRow) return;
		const id = appointmentRowId(clientReviewRow);
		if (!id) return;
		setProvSubmit(true);
		setProvMsg('');
		try {
			if (provElig?.canReview) {
				const res = await createReviewForAppointment(id, {
					rating: Number(provForm.rating),
					comment: provForm.comment
				});
				setProvMsg(res.message || 'Reseña publicada.');
			} else if (provElig?.hasReview && provElig.reviewId) {
				if (provElig.canEdit === false) {
					setProvMsg('El plazo de edición (24 h) expiró.');
					setProvSubmit(false);
					return;
				}
				const res = await updateMyReview(String(provElig.reviewId), {
					rating: Number(provForm.rating),
					comment: provForm.comment
				});
				setProvMsg(res.message || 'Reseña actualizada.');
			} else {
				setProvMsg('No se puede reseñar en este momento.');
				setProvSubmit(false);
				return;
			}
			await reloadBookings();
			const e2 = await fetchReviewEligibility(id);
			setProvElig(e2);
			if (e2?.review) {
				setProvForm({ rating: e2.review.rating, comment: e2.review.comment || e2.review.observation || '' });
			}
		} catch (err) {
			setProvMsg(err.response?.data?.message || 'Error al guardar la reseña.');
		} finally {
			setProvSubmit(false);
		}
	}

	return (
		<div className="page provider-dashboard">
			<Link className="back-link" to="/">
				← Volver al inicio
			</Link>
			<div className="page-surface page-surface--wide page-surface--provider-dash">
				<header className="provider-dash-header">
					<div className="provider-dash-header__text">
						<h1 id="provider-dashboard-title">{isVet ? 'Inicio de clínica' : 'Panel de servicios'}</h1>
						<p className="provider-dash-header__lede">
							{isVet
								? 'Líneas de atención (cada prof. o servicio) y tramos sueltos que el cliente reserva en línea.'
								: 'Gestiona solicitudes de paseo o cuidado y el estado de tus reservas.'}
						</p>
					</div>
					<div className="provider-dash-header__actions" aria-labelledby="provider-dashboard-title">
						{user.status === 'en_revision' ? (
							<span className="provider-dash-badge" title="Tu perfil aún no está publicado en el mapa">
								En revisión
							</span>
						) : null}
						<Link className="provider-dash-config-link" to="/proveedor/mi-perfil">
							{isVet ? 'Configuración de la clínica' : 'Configurar perfil y tarifas'}
						</Link>
						<Link className="provider-dash-secondary-link" to="/proveedor/mis-resenas">
							Reseñas recibidas
						</Link>
					</div>
				</header>
			</div>

			<div className="app-form provider-dashboard__flow">
			<section className="edit-fieldset book-section provider-dash-section">
				<h2 id="reservas-calendario">
					{isVet ? 'Reservas y calendario' : 'Reservas'}
				</h2>
				{isVet ? (
					<>
						<div
							className="vet-agenda__tabs"
							role="tablist"
							aria-label="Vista de agenda: citas o tramos ofrecidos"
						>
							<button
								type="button"
								role="tab"
								id="tab-vet-citas"
								aria-controls="panel-vet-citas"
								aria-selected={vetAgendaTab === 'citas'}
								className="vet-agenda__tab"
								onClick={() => setVetAgendaTab('citas')}
							>
								Citas y reservas
							</button>
							<button
								type="button"
								role="tab"
								id="tab-vet-oferta"
								aria-controls="panel-vet-oferta"
								aria-selected={vetAgendaTab === 'oferta'}
								className="vet-agenda__tab"
								onClick={() => setVetAgendaTab('oferta')}
							>
								Tramos ofrecidos
							</button>
						</div>

						{vetAgendaTab === 'citas' ? (
							<div id="panel-vet-citas" role="tabpanel" aria-labelledby="tab-vet-citas">
								<p className="hint muted" style={{ marginTop: 0, maxWidth: '50rem' }}>
									<strong>Calendario (hora Chile):</strong> solo <strong>reservas con dueño y mascota</strong>
									(confirmadas o pendientes). La tabla de abajo sirve para confirmar, cancelar, completar o
									ir a ficha. Para ver u operar <strong>tramos sueltos aún a la venta</strong>, abre la
									pestaña <em>Tramos ofrecidos</em>.
								</p>
								<ProviderClinicCalendar
									key="vet-citas"
									events={calendarEvents}
									mode="citas"
									citasLoading={loadingBookings}
								/>
							</div>
						) : (
							<div id="panel-vet-oferta" role="tabpanel" aria-labelledby="tab-vet-oferta">
								<p className="hint muted" style={{ marginTop: 0, maxWidth: '50rem' }}>
									<strong>Oferta a futuro:</strong> tramos aún reservables (libre o &quot;cerrado&quot; en
									app), ordenados en día / semana / mes. Elige <strong>una línea</strong> o déjalo en
									<strong> todas</strong>. Cada bloque: Cerrar, Abrir o Quitar. Para rellenar fechas, usa
									<strong> Mantenimiento</strong> en la otra pestaña.
								</p>
								<div className="vet-oferta-linebar">
									<span className="vet-oferta-linebar__label">Línea de atención</span>
									<div className="vet-oferta-linebar__chips">
										<button
											type="button"
											className={'vet-oferta-linebar__chip' + (ofertaLineFilter === '' ? ' is-active' : '')}
											aria-pressed={ofertaLineFilter === ''}
											onClick={() => setOfertaLineFilter('')}
										>
											Todas las líneas
										</button>
										{clinicLines
											.filter((l) => l.active !== false)
											.map((l) => {
												const id = String(l._id != null ? l._id : l.id != null ? l.id : '');
												if (!id) return null;
												return (
													<button
														key={id}
														type="button"
														className={
															'vet-oferta-linebar__chip' +
															(ofertaLineFilter === id ? ' is-active' : '')
														}
														aria-pressed={ofertaLineFilter === id}
														onClick={() => setOfertaLineFilter(id)}
													>
														{l.displayName || 'Línea'}
													</button>
												);
											})}
									</div>
									<span className="vet-oferta-linebar__count" aria-live="polite">
										{filteredOfertaSlots.length} tramo
										{filteredOfertaSlots.length === 1 ? '' : 's'}
									</span>
								</div>
								<ProviderClinicCalendar
									key="vet-oferta"
									events={ofertaCalEvents}
									mode="oferta"
									agendaLoading={loadingSlots}
									onSlotBlock={onBlockSlot}
									onSlotUnblock={onUnblockSlot}
									onSlotDelete={onDeleteSlot}
								/>
							</div>
						)}

						{agendaError ? (
							<p className="error" style={{ marginTop: 8 }} role="alert">
								{agendaError}
							</p>
						) : null}
						{agendaMsg && !agendaError ? <p className="review-success" style={{ marginTop: 6 }}>{agendaMsg}</p> : null}
						{vetAgendaTab === 'citas' ? (
							<>
								<details className="agenda-advanced-details" id="agenda-mantenimiento" style={{ marginTop: 8 }}>
									<summary className="muted" style={{ cursor: 'pointer', fontSize: '0.95rem', listStyle: 'revert' }}>
										Mantenimiento: rellenar franjas o &quot;permitir otra vez&quot; tramos quitados a mano
									</summary>
									<p className="hint muted" style={{ margin: '0.5rem 0' }}>
										<strong>Rellenar:</strong> añade tramos faltantes en 8 semanas, respetando reservas y
										omitidos. <strong>Permitir otra vez</strong> usa el rango de fechas bajo: limpia la memoria
										de una franja que borraste a mano para que pueda volver a publicarse.
									</p>
									<div className="agenda-generate-form" style={{ marginBottom: 4 }}>
										<div className="edit-row-2">
											<label className="edit-field">
												<span>Rango: desde (fecha)</span>
												<input type="date" value={omitsFrom} onChange={(e) => setOmitsFrom(e.target.value)} />
											</label>
											<label className="edit-field">
												<span>Hasta</span>
												<input type="date" value={omitsTo} onChange={(e) => setOmitsTo(e.target.value)} />
											</label>
										</div>
									</div>
									<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 2 }}>
										<form onSubmit={onForceFillAgenda} style={{ margin: 0 }}>
											<button type="submit" className="btn-sm" style={{ margin: 0 }}>
												Rellenar agenda ahora
											</button>
										</form>
										<form onSubmit={onClearOmittedAgenda} style={{ margin: 0 }}>
											<button type="submit" className="btn-sm">
												Permitir otra vez (rango de arriba)
											</button>
										</form>
									</div>
								</details>
								<p className="hint muted" style={{ margin: '0.5rem 0 0' }}>
									Desde <strong>Atención clínica</strong> en la tabla abres ficha; confirma o reseña al dueño
									con los botones de la fila.
								</p>
							</>
						) : null}
					</>
				) : (
					<p className="hint muted" style={{ marginTop: 0 }}>
						Confirmar o cancelar; en paseo y cuidado podrás marcar el servicio como completado.
					</p>
				)}
				{bookingActionMsg ? <p className='review-success'>{bookingActionMsg}</p> : null}
				{bookingActionErr ? <p className='error'>{bookingActionErr}</p> : null}
				{!isVet || vetAgendaTab === 'citas' ? (
					<>
						{loadingBookings ? <p>Cargando…</p> : null}
						{error ? <p className='error'>{error}</p> : null}
						{!loadingBookings && bookings.length === 0 ? (
							<p className='muted'>Aún no hay ítems.</p>
						) : null}
						{bookings.length > 0 ? (
					<div className='bookings-table-wrap'>
						<table className='bookings-table'>
							<thead>
								<tr>
									<th>Fecha</th>
									{isVet ? <th>Línea o servicio</th> : null}
									<th>Origen</th>
									<th>Cliente</th>
									<th>Detalle / mascota</th>
									<th>Estado</th>
									<th>Acciones</th>
								</tr>
							</thead>
							<tbody>
								{bookings.map((row) => {
									const own = row.owner;
									const st = APPOINTMENT_STATUS_LABELS[row.status] || row.status;
									const origin = BOOKING_SOURCE_LABELS[row.bookingSource] || row.bookingSource;
									const pet = row.pet;
									const detail = [pet?.name, pet?.species, row.reason].filter(Boolean).join(' · ') || '—';
									const showConfirm = canConfirm(row);
									const showCancel = canCancel(row);
									const showComplete =
										canCompleteWalker(row) || (isVet && canCompleteVetClinicSlot(row));
									const showClinical = canRegisterClinical(row);
									const showClientReview = canProviderReviewClientRow(row);
									const pid = petIdString(row);
									const lineLabel = isVet
										? row.clinicService?.displayName
											? String(row.clinicService.displayName)
											: row.bookingSource === 'walker_request'
												? 'Paseo / cuidado'
												: '—'
										: null;
									return (
										<tr key={`${row.kind}-${row.id}`}>
											<td>{formatRange(row.startAt, row.endAt)}</td>
											{isVet ? <td>{lineLabel || '—'}</td> : null}
											<td>{origin}</td>
											<td>{ownerLabel(own)}</td>
											<td className='bookings-detail'>{detail}</td>
											<td>{st}</td>
											<td className='provider-booking-actions'>
												{showConfirm ? (
													<button type='button' className='btn-approve btn-sm' onClick={() => onConfirmBooking(row)}>
														Confirmar
													</button>
												) : null}
												{showCancel ? (
													<button type='button' className='btn-reject btn-sm' onClick={() => onCancelBooking(row)}>
														Cancelar
													</button>
												) : null}
												{showComplete ? (
													<button
														type='button'
														className='btn-complete btn-sm'
														onClick={() => onCompleteBooking(row)}
													>
														Completar
													</button>
												) : null}
												{showClinical ? (
													<Link
														className='btn-sm'
														to={`/proveedor/atencion-clinica?appointmentId=${encodeURIComponent(String(row.id))}&petId=${encodeURIComponent(pid)}`}
													>
														Atención clínica
													</Link>
												) : null}
												{showClientReview ? (
													<button
														type='button'
														className='btn-sm'
														onClick={() => setClientReviewRow(row)}
													>
														Reseña al dueño
													</button>
												) : null}
												{!showConfirm &&
												!showCancel &&
												!showComplete &&
												!showClinical &&
												!showClientReview ? (
													<span className='muted'>—</span>
												) : null}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
						) : null}
					</>
				) : null}
			</section>

			{isVet || isWalkerCare ? (
				<>
					{isVet ? (
						<section
							className="edit-fieldset book-section"
							aria-labelledby="clinic-lines-heading"
						>
							<h2 id="clinic-lines-heading">1. Líneas de atención (servicio o profesional)</h2>
							<p className="hint muted" style={{ marginTop: 0, maxWidth: '42rem' }}>
								En reserva, el dueño <strong>elige la línea</strong>. Cada línea tiene su propia
								duración (ej. 30 o 40 min) y a partir de eso se crean los <strong>tramos consecutivos</strong>{' '}
								en el horario de la clínica. Al cliente no se muestra el precio de consulta, solo
								identificación del servicio.
							</p>
							<p className="hint muted" style={{ margin: '0 0 0.75rem' }}>
								<strong>Recepción:</strong> hoy aplica un solo horario para toda la clínica,{' '}
								<Link to="/proveedor/mi-perfil">{agendaStart}–{agendaEnd} (clic para cambiarlo)</Link>.
							</p>
							{clinicLines.length > 0 ? (
								<ul className="clinic-line-summary" style={{ margin: '0 0 1rem', paddingLeft: '1.1rem' }}>
									{clinicLines
										.filter((l) => l.active !== false)
										.map((l) => (
											<li key={String(l._id || l.id)}>
												<strong>{l.displayName}</strong>
												{l.slotDurationMinutes ? ` · franja de ${l.slotDurationMinutes} min` : null}
											</li>
										))}
								</ul>
							) : null}
							<form className="agenda-generate-form" onSubmit={onAddClinicLine} style={{ marginBottom: 8 }}>
								<div className="edit-row-2">
									<label className="edit-field">
										<span>Nombre (ej. Consulta Dra. Soto, Estética)</span>
										<input
											type="text"
											value={newLineName}
											onChange={(e) => setNewLineName(e.target.value)}
											placeholder="Nombre visible en la reserva"
											maxLength={120}
										/>
									</label>
									<label className="edit-field">
										<span>Duración de cada tramo (min)</span>
										<input
											type="number"
											min={15}
											max={180}
											step={5}
											value={newLineMins}
											onChange={(e) => setNewLineMins(Number(e.target.value) || 30)}
										/>
									</label>
								</div>
								<button type="submit" className="btn-sm">
									Añadir línea
								</button>
							</form>
							{clinicLineMsg ? <p className="review-success">{clinicLineMsg}</p> : null}
						</section>
					) : null}

					{isWalkerCare && !isVet ? (
						<section className="edit-fieldset book-section">
							<h2>Servicios ofrecidos (con precio referencia)</h2>
							<p className="hint muted">
								Los precios se muestran en el perfil. La disponibilidad y solicitudes de paseo o cuidado
								van en otra sección; aquí defines líneas y tarifa referencia.
							</p>
							{clinicLines.length > 0 ? (
								<p className="hint muted" style={{ margin: '0 0 0.5rem' }}>
									<strong>Activas:</strong>{' '}
									{clinicLines
										.filter((l) => l.active !== false)
										.map((l) => {
											const p =
												l.priceClp != null ? ` (${l.priceClp} ${l.currency || 'CLP'})` : '';
											return `${l.displayName}${p}`;
										})
										.join(' · ')}
								</p>
							) : null}
							<form className="agenda-generate-form" onSubmit={onAddClinicLine} style={{ marginBottom: 16 }}>
								<div className="edit-row-2">
									<label className="edit-field">
										<span>Nombre del servicio</span>
										<input
											type="text"
											value={newLineName}
											onChange={(e) => setNewLineName(e.target.value)}
											placeholder="ej. Paseo 45 min"
											maxLength={120}
										/>
									</label>
									<label className="edit-field">
										<span>Minutos (duración o franja)</span>
										<input
											type="number"
											min={15}
											max={180}
											step={5}
											value={newLineMins}
											onChange={(e) => setNewLineMins(Number(e.target.value) || 30)}
										/>
									</label>
								</div>
								<label className="edit-field" style={{ marginTop: 8, display: 'block' }}>
									<span>Precio referencia (CLP)</span>
									<input
										type="number"
										min={0}
										step={1}
										value={newLinePrice}
										onChange={(e) => setNewLinePrice(e.target.value)}
										required
									/>
								</label>
								<button type="submit" className="btn-sm" style={{ marginTop: 8 }}>
									Agregar servicio con precio
								</button>
							</form>
							{clinicLineMsg ? <p className="review-success">{clinicLineMsg}</p> : null}
						</section>
					) : null}
				</>
			) : (
				<p className="muted">Añadiremos secciones según el tipo de proveedor cuando aplique.</p>
			)}
			</div>

			{clientReviewRow ? (
				<div
					className="report-modal-backdrop"
					role="presentation"
					onClick={() => {
						if (!provSubmit) closeClientReviewModal();
					}}
				>
					<div
						className="report-modal"
						role="dialog"
						aria-modal="true"
						aria-labelledby="prov-client-review-title"
						onClick={(e) => e.stopPropagation()}
					>
						<h3 id="prov-client-review-title">Reseña al dueño (cliente)</h3>
						<p className="muted" style={{ fontSize: '0.9rem' }}>
							{formatRange(clientReviewRow.startAt, clientReviewRow.endAt)} —{' '}
							{ownerLabel(clientReviewRow.owner || clientReviewRow.dueno)}
						</p>
						{provEligLoading ? <p>Cargando…</p> : null}
						{provEligErr ? <p className="error">{provEligErr}</p> : null}
						{!provEligLoading && provElig && !provElig.canReview && !provElig.hasReview ? (
							<p className="muted">
								En esta cita aún no aplica reseñar al cliente o no tienes permiso. Estado:{' '}
								{provElig.appointmentStatus || '—'}.
							</p>
						) : null}
						{!provEligLoading && provElig && (provElig.canReview || provElig.hasReview) ? (
							provElig.hasReview && provElig.canEdit === false ? (
								<div>
									<p>
										<strong>Calificación:</strong> {provForm.rating} / 5
									</p>
									{provForm.comment ? (
										<p>
											<strong>Observación:</strong> {provForm.comment}
										</p>
									) : null}
									<p className="muted" style={{ fontSize: '0.9rem' }}>
										La edición solo estuvo disponible 24 h tras publicar.
									</p>
									<div className="report-modal-actions">
										<button type="button" className="btn-sm" onClick={closeClientReviewModal}>
											Cerrar
										</button>
									</div>
								</div>
							) : (
								<form
									className="review-form"
									onSubmit={(e) => {
										e.preventDefault();
										void submitProviderToOwnerReview();
									}}
								>
									<label className="review-field">
										<span>Calificación (estrellas)</span>
										<select
											value={provForm.rating}
											onChange={(e) =>
												setProvForm((f) => ({ ...f, rating: Number(e.target.value) }))
											}
										>
											{[5, 4, 3, 2, 1].map((n) => (
												<option key={n} value={n}>
													{n} estrellas
												</option>
											))}
										</select>
									</label>
									<label className="review-field">
										<span>Observación (opcional, máx. 200)</span>
										<textarea
											value={provForm.comment}
											onChange={(e) =>
												setProvForm((f) => ({ ...f, comment: e.target.value }))
											}
											rows={3}
											maxLength={200}
										/>
									</label>
									{provElig.hasReview ? (
										<p className="muted" style={{ fontSize: '0.85rem' }}>
											Solo puedes editar en las 24 h posteriores a publicar.
										</p>
									) : null}
									{provMsg ? <p className="review-success">{provMsg}</p> : null}
									<div className="report-modal-actions">
										<button
											type="button"
											className="btn-sm"
											onClick={closeClientReviewModal}
											disabled={provSubmit}
										>
											Cerrar
										</button>
										<button type="submit" className="review-submit" disabled={provSubmit}>
											{provSubmit
												? 'Guardando…'
												: provElig.hasReview
													? 'Guardar cambios'
													: 'Publicar reseña'}
										</button>
									</div>
								</form>
							)
						) : null}
					</div>
				</div>
			) : null}
		</div>
	);
}
