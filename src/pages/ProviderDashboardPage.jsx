import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { CalendarDays, Stethoscope, Star, Settings2, ListChecks, LayoutGrid } from 'lucide-react';
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
	const [vetAgendaTab, setVetAgendaTab] = useState(/** @type {'citas' | 'oferta'} */ ('citas'));
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

	const ofertaCalEvents = useMemo(() => {
		return filteredOfertaSlots
			.map((s) => mapAgendaSlotToCalEvent(s))
			.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
	}, [filteredOfertaSlots]);

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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [authLoading, user, fillAgendaRange]);

	if (authLoading) {
		return (
			<div className='mx-auto w-full max-w-[1200px] px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]'>
				<p>Cargando…</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to='/login' replace state={{ from: '/proveedor' }} />;
	}

	if (!hasRole(user, 'proveedor')) {
		return (
			<div className='mx-auto w-full max-w-[1200px] px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]'>
				<Link
					className='inline-flex items-center gap-0.5 min-h-11 mb-2 px-0.5 py-0.5 text-primary font-semibold rounded-sm hover:text-primary/80 hover:underline'
					to='/'
				>
					Inicio
				</Link>
				<p className='rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive mb-3'>
					Solo cuentas de servicio (veterinario, paseo o cuidado).
				</p>
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

	const inputCls = 'h-10 w-full rounded-xl border border-input bg-background px-3 py-2.5 font-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

	return (
		<div className='mx-auto w-full max-w-[1200px] px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]'>
			<Link
				className='inline-flex items-center gap-0.5 min-h-11 mb-2 px-0.5 py-0.5 text-primary font-semibold rounded-sm hover:text-primary/80 hover:underline'
				to='/'
			>
				← Volver al inicio
			</Link>
		<div className='mx-auto w-full max-w-4xl rounded-2xl border border-border bg-card shadow-sm mb-4 overflow-hidden'>
			<div className='flex items-center gap-2 px-5 py-4 border-b border-border bg-gradient-to-r from-muted/40 to-transparent dark:from-muted/20'>
				<LayoutGrid className='w-4 h-4 text-primary/70 shrink-0' />
				<span className='text-[0.7rem] font-bold uppercase tracking-widest text-primary/70'>
					{isVet ? 'Veterinaria' : 'Proveedor'}
				</span>
			</div>
			<header className='flex flex-wrap items-start justify-between gap-4 gap-x-6 px-5 py-4'>
				<div className='min-w-[min(100%,22rem)] flex-1'>
					<h1
						id='provider-dashboard-title'
						className='text-[clamp(1.3rem,2.2vw,1.6rem)] font-bold tracking-tight text-foreground mb-1.5'
					>
						{isVet ? 'Inicio de clínica' : 'Panel de servicios'}
					</h1>
					<p className='m-0 text-[0.95rem] leading-snug text-muted-foreground max-w-[42rem]'>
						{isVet
							? 'Líneas de atención (cada prof. o servicio) y tramos sueltos que el cliente reserva en línea.'
							: 'Gestiona solicitudes de paseo o cuidado y el estado de tus reservas.'}
					</p>
				</div>
				<div className='flex flex-wrap items-center gap-2 shrink-0' aria-labelledby='provider-dashboard-title'>
					{user.status === 'en_revision' ? (
						<span
							className='inline-flex items-center rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
							title='Tu perfil aún no está publicado en el mapa'
						>
							En revisión
						</span>
					) : null}
					<Link
						className='inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground no-underline hover:bg-primary/90 transition-colors gap-1.5'
						to='/proveedor/mi-perfil'
					>
						<Settings2 className='w-4 h-4' />
						{isVet ? 'Configuración' : 'Perfil y tarifas'}
					</Link>
					<Link
						className='inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground no-underline hover:bg-muted transition-colors gap-1.5'
						to='/proveedor/mis-resenas'
					>
						<Star className='w-4 h-4' />
						Reseñas
					</Link>
				</div>
			</header>
		</div>

			<div className='flex flex-col gap-4 min-w-0 max-w-full'>
			<section className='rounded-2xl border border-border bg-card shadow-sm mt-1 overflow-hidden'>
				<div className='flex items-center gap-2 px-5 py-4 border-b border-border bg-gradient-to-r from-muted/40 to-transparent dark:from-muted/20'>
					<CalendarDays className='w-4 h-4 text-primary/70 shrink-0' />
					<h2 className='text-base font-bold text-foreground flex items-center gap-2'>
						{isVet ? 'Reservas y calendario' : 'Reservas'}
					</h2>
				</div>
				<div className='p-4 sm:p-5'>
					{isVet ? (
						<>
							<div
								className='flex flex-wrap gap-1.5 mt-0.5 mb-4 p-1 rounded-[0.55rem] border border-border bg-muted/40 dark:bg-muted'
								role='tablist'
								aria-label='Vista de agenda: citas o tramos ofrecidos'
							>
								<button
									type='button'
									role='tab'
									id='tab-vet-citas'
									aria-controls='panel-vet-citas'
									aria-selected={vetAgendaTab === 'citas'}
									className='rounded-[0.4rem] border border-transparent bg-transparent px-3.5 py-2 text-[0.9rem] font-semibold text-muted-foreground cursor-pointer transition-colors hover:bg-white hover:text-foreground dark:hover:bg-card aria-selected:bg-white aria-selected:text-primary aria-selected:border-primary/30 aria-selected:shadow-sm dark:aria-selected:bg-card'
									onClick={() => setVetAgendaTab('citas')}
								>
									Citas y reservas
								</button>
								<button
									type='button'
									role='tab'
									id='tab-vet-oferta'
									aria-controls='panel-vet-oferta'
									aria-selected={vetAgendaTab === 'oferta'}
									className='rounded-[0.4rem] border border-transparent bg-transparent px-3.5 py-2 text-[0.9rem] font-semibold text-muted-foreground cursor-pointer transition-colors hover:bg-white hover:text-foreground dark:hover:bg-card aria-selected:bg-white aria-selected:text-primary aria-selected:border-primary/30 aria-selected:shadow-sm dark:aria-selected:bg-card'
									onClick={() => setVetAgendaTab('oferta')}
								>
									Tramos ofrecidos
								</button>
							</div>

							{vetAgendaTab === 'citas' ? (
								<div id='panel-vet-citas' role='tabpanel' aria-labelledby='tab-vet-citas'>
								<p className='text-sm mb-2.5 text-muted-foreground mt-0 max-w-[50rem]'>
									<strong>Calendario (hora Chile):</strong> solo <strong>reservas con dueño y mascota</strong>
										(confirmadas o pendientes). La tabla de abajo sirve para confirmar, cancelar, completar o
										ir a ficha. Para ver u operar <strong>tramos sueltos aún a la venta</strong>, abre la
										pestaña <em>Tramos ofrecidos</em>.
									</p>
									<ProviderClinicCalendar
										key='vet-citas'
										events={calendarEvents}
										mode='citas'
										citasLoading={loadingBookings}
									/>
								</div>
							) : (
								<div id='panel-vet-oferta' role='tabpanel' aria-labelledby='tab-vet-oferta'>
								<p className='text-sm mb-2.5 text-muted-foreground mt-0 max-w-[50rem]'>
									<strong>Oferta a futuro:</strong> tramos aún reservables (libre o &quot;cerrado&quot; en
										app), ordenados en día / semana / mes. Elige <strong>una línea</strong> o déjalo en
										<strong> todas</strong>. Cada bloque: Cerrar, Abrir o Quitar. Para rellenar fechas, usa
										<strong> Mantenimiento</strong> en la otra pestaña.
									</p>
									<div className='flex flex-wrap items-center gap-2 mb-3.5'>
										<span className='text-[0.8rem] font-semibold text-[#475569] dark:text-muted-foreground'>
											Línea de atención
										</span>
										<div className='flex flex-wrap gap-1.5 items-center'>
											<button
												type='button'
												className={cn(
													'font-[inherit] text-[0.78rem] font-medium rounded-full border border-border bg-white dark:bg-card px-2.5 py-1.5 text-[#334155] dark:text-foreground cursor-pointer transition-colors hover:border-primary/40',
													ofertaLineFilter === '' && 'bg-primary/10 border-primary/45 text-primary font-semibold'
												)}
												aria-pressed={ofertaLineFilter === ''}
												onClick={() => setOfertaLineFilter('')}
											>
												Todas las líneas
											</button>
											{clinicLines
												.filter((l) => l.active !== false)
												.map((l) => {
													const lineId = String(l._id != null ? l._id : l.id != null ? l.id : '');
													if (!lineId) return null;
													return (
														<button
															key={lineId}
															type='button'
															className={cn(
																'font-[inherit] text-[0.78rem] font-medium rounded-full border border-border bg-white dark:bg-card px-2.5 py-1.5 text-[#334155] dark:text-foreground cursor-pointer transition-colors hover:border-primary/40',
																ofertaLineFilter === lineId && 'bg-primary/10 border-primary/45 text-primary font-semibold'
															)}
															aria-pressed={ofertaLineFilter === lineId}
															onClick={() => setOfertaLineFilter(lineId)}
														>
															{l.displayName || 'Línea'}
														</button>
													);
												})}
										</div>
										<span className='text-[0.8rem] text-muted-foreground' aria-live='polite'>
											{filteredOfertaSlots.length} tramo
											{filteredOfertaSlots.length === 1 ? '' : 's'}
										</span>
									</div>
									<ProviderClinicCalendar
										key='vet-oferta'
										events={ofertaCalEvents}
										mode='oferta'
										agendaLoading={loadingSlots}
										onSlotBlock={onBlockSlot}
										onSlotUnblock={onUnblockSlot}
										onSlotDelete={onDeleteSlot}
									/>
								</div>
							)}

						{agendaError ? (
							<p className='rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive mb-3 mt-2' role='alert'>
								{agendaError}
							</p>
						) : null}
						{agendaMsg && !agendaError ? (
							<p className='text-sm text-green-700 dark:text-green-400 mt-1.5'>
								{agendaMsg}
							</p>
						) : null}
							{vetAgendaTab === 'citas' ? (
								<>
						<details id='agenda-mantenimiento' className='mt-2 rounded-xl border border-border bg-muted/20 overflow-hidden'>
									<summary className='flex cursor-pointer items-center gap-2 px-4 py-3 text-[0.88rem] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors select-none list-none [&::-webkit-details-marker]:hidden'>
										Mantenimiento: rellenar franjas o &quot;permitir otra vez&quot; tramos quitados a mano
									</summary>
									<div className='px-4 pb-4 pt-2'>
										<p className='text-sm text-muted-foreground my-2'>
											<strong>Rellenar:</strong> añade tramos faltantes en 8 semanas, respetando reservas y
											omitidos. <strong>Permitir otra vez</strong> usa el rango de fechas bajo: limpia la memoria
											de una franja que borraste a mano para que pueda volver a publicarse.
										</p>
										<div className='mb-1'>
											<div className='grid grid-cols-2 gap-3 max-sm:grid-cols-1'>
												<label className='flex flex-col gap-1.5 mb-3 text-sm last:mb-0'>
													<span>Rango: desde (fecha)</span>
													<input className={inputCls} type='date' value={omitsFrom} onChange={(e) => setOmitsFrom(e.target.value)} />
												</label>
												<label className='flex flex-col gap-1.5 mb-3 text-sm last:mb-0'>
													<span>Hasta</span>
													<input className={inputCls} type='date' value={omitsTo} onChange={(e) => setOmitsTo(e.target.value)} />
												</label>
											</div>
										</div>
										<div className='flex flex-wrap gap-2'>
											<form onSubmit={onForceFillAgenda} className='m-0'>
												<button
													type='submit'
													className='inline-flex h-8 items-center px-3 rounded-lg border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors cursor-pointer'
												>
													Rellenar agenda ahora
												</button>
											</form>
											<form onSubmit={onClearOmittedAgenda} className='m-0'>
												<button
													type='submit'
													className='inline-flex h-8 items-center px-3 rounded-lg border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors cursor-pointer'
												>
													Permitir otra vez (rango de arriba)
												</button>
											</form>
										</div>
									</div>
								</details>
								<p className='text-sm text-muted-foreground mt-2'>
									Desde <strong>Atención clínica</strong> en la tabla abres ficha; confirma o reseña al dueño
									con los botones de la fila.
								</p>
								</>
							) : null}
						</>
					) : (
						<>
							<p className='text-sm text-muted-foreground mt-0 mb-2.5 max-w-[50rem]'>
								<strong>Calendario (hora Chile):</strong> solicitudes y reservas no canceladas. Desde la{' '}
								<strong>tabla</strong> de abajo puedes confirmar, cancelar o marcar como completado.
							</p>
							<ProviderClinicCalendar
								key='walker-citas'
								events={calendarEvents}
								mode='citas'
								citasLoading={loadingBookings}
							/>
						</>
					)}
					{bookingActionMsg ? (
						<p className='text-sm text-green-700 dark:text-green-400'>{bookingActionMsg}</p>
					) : null}
					{bookingActionErr ? (
						<p className='rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive mb-3'>
							{bookingActionErr}
						</p>
					) : null}
					{!isVet || vetAgendaTab === 'citas' ? (
						<>
							{loadingBookings ? <p className='text-muted-foreground'>Cargando…</p> : null}
							{error ? (
								<p className='rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive mb-3'>
									{error}
								</p>
							) : null}
							{!loadingBookings && bookings.length === 0 ? (
								<p className='text-muted-foreground'>Aún no hay ítems.</p>
							) : null}
							{bookings.length > 0 ? (
							<div className='overflow-x-auto rounded-xl border border-border bg-card mt-4 shadow-sm'>
								<table className='w-full border-collapse text-sm'>
									<thead>
										<tr>
											<th className='px-4 py-3 text-left text-[0.72rem] font-bold uppercase tracking-wide text-muted-foreground border-b border-border bg-muted/40 dark:bg-muted/20 whitespace-nowrap'>Fecha</th>
											{isVet ? <th className='px-4 py-3 text-left text-[0.72rem] font-bold uppercase tracking-wide text-muted-foreground border-b border-border bg-muted/40 dark:bg-muted/20 whitespace-nowrap'>Línea o servicio</th> : null}
											<th className='px-4 py-3 text-left text-[0.72rem] font-bold uppercase tracking-wide text-muted-foreground border-b border-border bg-muted/40 dark:bg-muted/20 whitespace-nowrap'>Origen</th>
											<th className='px-4 py-3 text-left text-[0.72rem] font-bold uppercase tracking-wide text-muted-foreground border-b border-border bg-muted/40 dark:bg-muted/20 whitespace-nowrap'>Cliente</th>
											<th className='px-4 py-3 text-left text-[0.72rem] font-bold uppercase tracking-wide text-muted-foreground border-b border-border bg-muted/40 dark:bg-muted/20 whitespace-nowrap'>Detalle / mascota</th>
											<th className='px-4 py-3 text-left text-[0.72rem] font-bold uppercase tracking-wide text-muted-foreground border-b border-border bg-muted/40 dark:bg-muted/20 whitespace-nowrap'>Estado</th>
											<th className='px-4 py-3 text-left text-[0.72rem] font-bold uppercase tracking-wide text-muted-foreground border-b border-border bg-muted/40 dark:bg-muted/20 whitespace-nowrap'>Acciones</th>
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
											<tr key={`${row.kind}-${row.id}`} className='hover:bg-muted/20 transition-colors'>
												<td className='px-4 py-3 text-sm border-b border-border/60 align-top'>{formatRange(row.startAt, row.endAt)}</td>
												{isVet ? <td className='px-4 py-3 text-sm border-b border-border/60 align-top'>{lineLabel || '—'}</td> : null}
												<td className='px-4 py-3 text-sm border-b border-border/60 align-top'>{origin}</td>
												<td className='px-4 py-3 text-sm border-b border-border/60 align-top'>{ownerLabel(own)}</td>
												<td className='px-4 py-3 text-sm border-b border-border/60 align-top text-muted-foreground'>{detail}</td>
												<td className='px-4 py-3 text-sm border-b border-border/60 align-top'>{st}</td>
												<td className='px-4 py-3 text-sm border-b border-border/60 align-top'>
															<div className='flex flex-wrap gap-1.5 items-center whitespace-nowrap'>
															{showConfirm ? (
																<button
																	type='button'
																	className='inline-flex h-8 items-center px-3 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-600 transition-colors border-0 cursor-pointer'
																	onClick={() => onConfirmBooking(row)}
																>
																	Confirmar
																</button>
															) : null}
															{showCancel ? (
																<button
																	type='button'
																	className='inline-flex h-8 items-center px-3 rounded-lg border border-red-200 bg-white dark:bg-card text-red-800 dark:text-red-300 dark:border-red-900 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer'
																	onClick={() => onCancelBooking(row)}
																>
																	Cancelar
																</button>
															) : null}
															{showComplete ? (
																<button
																	type='button'
																	className='inline-flex h-8 items-center px-3 rounded-lg bg-teal-700 text-white text-xs font-bold hover:bg-teal-600 transition-colors border-0 cursor-pointer'
																	onClick={() => onCompleteBooking(row)}
																>
																	Completar
																</button>
															) : null}
															{showClinical ? (
																<Link
																	className='inline-flex h-8 items-center px-3 rounded-lg border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors'
																	to={`/proveedor/atencion-clinica?appointmentId=${encodeURIComponent(String(row.id))}&petId=${encodeURIComponent(pid)}`}
																>
																	Atención clínica
																</Link>
															) : null}
															{showClientReview ? (
																<button
																	type='button'
																	className='inline-flex h-8 items-center px-3 rounded-lg border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors cursor-pointer'
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
																	<span className='text-muted-foreground'>—</span>
																) : null}
															</div>
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
				</div>
				</section>

				{isVet || isWalkerCare ? (
					<>
						{isVet ? (
							<section
								className='rounded-2xl border border-border bg-card shadow-sm overflow-hidden'
								aria-labelledby='clinic-lines-heading'
							>
							<div className='flex items-center gap-2 px-5 py-4 border-b border-border bg-gradient-to-r from-muted/40 to-transparent dark:from-muted/20'>
								<Stethoscope className='w-4 h-4 text-primary/70 shrink-0' />
								<h2 id='clinic-lines-heading' className='text-base font-bold text-foreground'>
									Líneas de atención (servicio o profesional)
								</h2>
							</div>
							<div className='p-4 sm:p-5'>
							<p className='text-sm text-muted-foreground mt-0 max-w-[42rem] mb-2.5'>
								En reserva, el dueño <strong>elige la línea</strong>. Cada línea tiene su propia
								duración (ej. 30 o 40 min) y a partir de eso se crean los <strong>tramos consecutivos</strong>{' '}
								en el horario de la clínica. Al cliente no se muestra el precio de consulta, solo
								identificación del servicio.
							</p>
							<p className='text-sm text-muted-foreground mb-3'>
								<strong>Recepción:</strong> hoy aplica un solo horario para toda la clínica,{' '}
								<Link to='/proveedor/mi-perfil' className='text-primary hover:underline'>
									{agendaStart}–{agendaEnd} (clic para cambiarlo)
								</Link>.
							</p>
							{clinicLines.length > 0 ? (
								<div className='flex flex-wrap gap-2 mb-4'>
									{clinicLines
										.filter((l) => l.active !== false)
										.map((l) => (
											<div key={String(l._id || l.id)} className='inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-sm'>
												<span className='font-semibold'>{l.displayName}</span>
												{l.slotDurationMinutes ? <span className='text-muted-foreground text-xs'>· {l.slotDurationMinutes} min</span> : null}
											</div>
										))}
								</div>
							) : null}
							<form className='mb-2' onSubmit={onAddClinicLine}>
								<div className='grid grid-cols-2 gap-3 max-sm:grid-cols-1'>
									<label className='flex flex-col gap-1.5 mb-3 text-sm last:mb-0'>
										<span>Nombre (ej. Consulta Dra. Soto, Estética)</span>
										<input
											className={inputCls}
											type='text'
											value={newLineName}
											onChange={(e) => setNewLineName(e.target.value)}
											placeholder='Nombre visible en la reserva'
											maxLength={120}
										/>
									</label>
									<label className='flex flex-col gap-1.5 mb-3 text-sm last:mb-0'>
										<span>Duración de cada tramo (min)</span>
										<input
											className={inputCls}
											type='number'
											min={15}
											max={180}
											step={5}
											value={newLineMins}
											onChange={(e) => setNewLineMins(Number(e.target.value) || 30)}
										/>
									</label>
								</div>
								<button
									type='submit'
									className='inline-flex h-9 items-center px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors border-0 cursor-pointer'
								>
									Añadir línea
								</button>
							</form>
							{clinicLineMsg ? (
								<p className='text-sm text-green-700 dark:text-green-400'>{clinicLineMsg}</p>
							) : null}
							</div>
						</section>
					) : null}

					{isWalkerCare && !isVet ? (
						<section className='rounded-2xl border border-border bg-card shadow-sm overflow-hidden'>
							<div className='flex items-center gap-2 px-5 py-4 border-b border-border bg-gradient-to-r from-muted/40 to-transparent dark:from-muted/20'>
								<ListChecks className='w-4 h-4 text-primary/70 shrink-0' />
								<h2 className='text-base font-bold text-foreground'>
									Servicios ofrecidos (con precio referencia)
								</h2>
							</div>
							<div className='p-4 sm:p-5'>
							<p className='text-sm text-muted-foreground mb-2.5'>
								Los precios se muestran en el perfil. La disponibilidad y solicitudes de paseo o cuidado
								van en otra sección; aquí defines líneas y tarifa referencia.
							</p>
							{clinicLines.length > 0 ? (
								<div className='flex flex-wrap gap-2 mb-4'>
									{clinicLines
										.filter((l) => l.active !== false)
										.map((l) => {
											const p =
												l.priceClp != null ? ` (${l.priceClp} ${l.currency || 'CLP'})` : '';
											return (
												<div key={String(l._id || l.id)} className='inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-sm'>
													<span className='font-semibold'>{l.displayName}</span>
													{p ? <span className='text-muted-foreground text-xs'>{p}</span> : null}
												</div>
											);
										})}
								</div>
							) : null}
							<form className='mb-4' onSubmit={onAddClinicLine}>
								<div className='grid grid-cols-2 gap-3 max-sm:grid-cols-1'>
									<label className='flex flex-col gap-1.5 mb-3 text-sm last:mb-0'>
										<span>Nombre del servicio</span>
										<input
											className={inputCls}
											type='text'
											value={newLineName}
											onChange={(e) => setNewLineName(e.target.value)}
											placeholder='ej. Paseo 45 min'
											maxLength={120}
										/>
									</label>
									<label className='flex flex-col gap-1.5 mb-3 text-sm last:mb-0'>
										<span>Minutos (duración o franja)</span>
										<input
											className={inputCls}
											type='number'
											min={15}
											max={180}
											step={5}
											value={newLineMins}
											onChange={(e) => setNewLineMins(Number(e.target.value) || 30)}
										/>
									</label>
								</div>
								<label className='flex flex-col gap-1.5 mb-3 text-sm last:mb-0 mt-2'>
										<span>Precio referencia (CLP)</span>
										<input
											className={inputCls}
											type='number'
											min={0}
											step={1}
											value={newLinePrice}
											onChange={(e) => setNewLinePrice(e.target.value)}
											required
										/>
									</label>
								<button
									type='submit'
									className='inline-flex h-9 items-center px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors border-0 cursor-pointer mt-2'
								>
									Agregar servicio con precio
								</button>
							</form>
							{clinicLineMsg ? (
								<p className='text-sm text-green-700 dark:text-green-400'>{clinicLineMsg}</p>
							) : null}
							</div>
						</section>
					) : null}
					</>
				) : (
					<p className='text-muted-foreground'>
						Añadiremos secciones según el tipo de proveedor cuando aplique.
					</p>
				)}
			</div>

		{clientReviewRow ? (
			<div
				className='fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4'
				role='presentation'
				onClick={() => {
					if (!provSubmit) closeClientReviewModal();
				}}
			>
				<div
					className='rounded-2xl border border-border bg-card shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-auto'
					role='dialog'
					aria-modal='true'
					aria-labelledby='prov-client-review-title'
					onClick={(e) => e.stopPropagation()}
				>
					<h3 id='prov-client-review-title' className='text-lg font-bold text-foreground mb-1'>
						Reseña al dueño (cliente)
					</h3>
						<p className='text-muted-foreground text-[0.9rem] mb-3'>
							{formatRange(clientReviewRow.startAt, clientReviewRow.endAt)} —{' '}
							{ownerLabel(clientReviewRow.owner || clientReviewRow.dueno)}
						</p>
						{provEligLoading ? <p className='text-muted-foreground'>Cargando…</p> : null}
						{provEligErr ? (
							<p className='rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive mb-3'>
								{provEligErr}
							</p>
						) : null}
						{!provEligLoading && provElig && !provElig.canReview && !provElig.hasReview ? (
							<p className='text-muted-foreground text-sm'>
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
									<p className='text-muted-foreground text-[0.9rem] mb-2'>
										La edición solo estuvo disponible 24 h tras publicar.
									</p>
								<div className='flex gap-2 justify-end mt-2'>
									<button
										type='button'
										className='inline-flex h-8 items-center px-3 rounded-lg border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors cursor-pointer'
										onClick={closeClientReviewModal}
									>
										Cerrar
									</button>
								</div>
							</div>
						) : (
							<form
								className='flex flex-col gap-3'
								onSubmit={(e) => {
									e.preventDefault();
									void submitProviderToOwnerReview();
								}}
							>
								<label className='flex flex-col gap-1.5 text-sm'>
									<span>Calificación (estrellas)</span>
									<select
										className='h-10 w-full rounded-xl border border-input bg-background px-3 py-2.5 font-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
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
								<label className='flex flex-col gap-1.5 text-sm'>
									<span>Observación (opcional, máx. 200)</span>
									<textarea
										className='w-full rounded-xl border border-input bg-background px-3 py-2.5 font-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
										value={provForm.comment}
										onChange={(e) =>
											setProvForm((f) => ({ ...f, comment: e.target.value }))
										}
										rows={3}
										maxLength={200}
									/>
								</label>
								{provElig.hasReview ? (
									<p className='text-muted-foreground text-[0.85rem]'>
										Solo puedes editar en las 24 h posteriores a publicar.
									</p>
								) : null}
								{provMsg ? (
									<p className='text-sm text-green-700 dark:text-green-400'>{provMsg}</p>
								) : null}
								<div className='flex gap-2 justify-end mt-2'>
									<button
										type='button'
										className='inline-flex h-8 items-center px-3 rounded-lg border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors cursor-pointer disabled:opacity-60'
										onClick={closeClientReviewModal}
										disabled={provSubmit}
									>
										Cerrar
									</button>
									<button
										type='submit'
										className='inline-flex h-10 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-65 disabled:cursor-not-allowed border-0 cursor-pointer'
										disabled={provSubmit}
									>
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
