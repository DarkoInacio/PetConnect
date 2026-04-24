import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
	confirmAppointmentAsProvider,
	cancelAppointmentAsProvider,
	completeWalkerAppointmentAsProvider
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
import { cancelCitaAsProvider, confirmCitaAsProvider, recordCitaDiagnostico } from '../services/citas';
import { formatChileDateTimeRange, formatInChile, formatTimeInChile } from '../constants/chileTime';
import { hasRole } from '../lib/userRoles';
import {
	ProviderClinicCalendar,
	mapBookingToCalEvent,
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

const CITA_ESTADO_LABELS = {
	pendiente: 'Pendiente',
	confirmada: 'Confirmada',
	completada: 'Completada',
	cancelada: 'Cancelada'
};

const BOOKING_SOURCE_LABELS = {
	availability_slot: 'Agenda',
	legacy_cita: 'Cita clásica',
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

export function ProviderDashboardPage() {
	const { user, loading: authLoading } = useAuth();
	const [bookings, setBookings] = useState([]);
	const [slots, setSlots] = useState([]);
	const [loadingBookings, setLoadingBookings] = useState(true);
	const [loadingSlots, setLoadingSlots] = useState(true);
	const [error, setError] = useState('');
	/** Filtro por defecto: hoy y dos semanas; vaciar ambas fechas = ver toda la agenda futura. */
	const [agendaFrom, setAgendaFrom] = useState(() => toYmdLocal(new Date()));
	const [agendaTo, setAgendaTo] = useState(() => {
		const d = new Date();
		d.setDate(d.getDate() + 14);
		return toYmdLocal(d);
	});
	const [agendaMsg, setAgendaMsg] = useState('');
	const [agendaError, setAgendaError] = useState('');
	const [bookingActionMsg, setBookingActionMsg] = useState('');
	const [bookingActionErr, setBookingActionErr] = useState('');
	const [clinicLines, setClinicLines] = useState([]);
	const [newLineName, setNewLineName] = useState('');
	const [newLineMins, setNewLineMins] = useState(30);
	const [newLinePrice, setNewLinePrice] = useState('');
	const [clinicLineMsg, setClinicLineMsg] = useState('');
	const didAutoAgenda = useRef(false);

	const calendarEvents = useMemo(() => {
		return (Array.isArray(bookings) ? bookings : [])
			.filter(filterBookingsForCalendar)
			.map((row) => mapBookingToCalEvent(row, ownerLabel));
	}, [bookings]);

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
				const s = await listMyAgendaSlots(c.signal, buildSlotsListParams(agendaFrom, agendaTo));
				setSlots(Array.isArray(s.slots) ? s.slots : []);
			} catch {
				setSlots([]);
			} finally {
				setLoadingSlots(false);
			}
		})();
		return () => c.abort();
	}, [authLoading, user, agendaFrom, agendaTo]);

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
				const s = await listMyAgendaSlots(undefined, buildSlotsListParams(agendaFrom, agendaTo));
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
				line += ` (${n} tramo(s) respetan borrados a mano; mira abajo en avanzada.)`;
			}
			setAgendaMsg(line);
			const s = await listMyAgendaSlots(undefined, buildSlotsListParams(agendaFrom, agendaTo));
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
					const s = await listMyAgendaSlots(undefined, buildSlotsListParams(agendaFrom, agendaTo));
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
		const from = agendaFrom.trim() || toYmdLocal(new Date());
		const to = agendaTo.trim() || from;
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
			const s = await listMyAgendaSlots(undefined, buildSlotsListParams(agendaFrom, agendaTo));
			setSlots(Array.isArray(s.slots) ? s.slots : []);
		} catch (err) {
			setAgendaError(err.response?.data?.message || 'No se pudo eliminar.');
		}
	}

	async function onBlockSlot(id) {
		try {
			setAgendaError('');
			await blockAgendaSlot(id);
			const s = await listMyAgendaSlots(undefined, buildSlotsListParams(agendaFrom, agendaTo));
			setSlots(Array.isArray(s.slots) ? s.slots : []);
		} catch (err) {
			setAgendaError(err.response?.data?.message || 'No se pudo bloquear.');
		}
	}

	async function onUnblockSlot(id) {
		try {
			setAgendaError('');
			await unblockAgendaSlot(id);
			const s = await listMyAgendaSlots(undefined, buildSlotsListParams(agendaFrom, agendaTo));
			setSlots(Array.isArray(s.slots) ? s.slots : []);
		} catch (err) {
			setAgendaError(err.response?.data?.message || 'No se pudo desbloquear.');
		}
	}

	async function onDiagnosticoCita(row) {
		const text = window.prompt('Registrar diagnóstico y completar cita (obligatorio):');
		if (!text || !text.trim()) return;
		setBookingActionErr('');
		try {
			await recordCitaDiagnostico(String(row.id), text.trim());
			setBookingActionMsg('Diagnóstico guardado.');
			await reloadBookings();
		} catch (err) {
			setBookingActionErr(err.response?.data?.message || 'No se pudo guardar.');
		}
	}

	async function onConfirmBooking(row) {
		setBookingActionMsg('');
		setBookingActionErr('');
		const rawId = row.id;
		const id = rawId != null ? String(rawId) : '';
		if (!id) return;
		try {
			if (row.kind === 'cita_legacy') {
				await confirmCitaAsProvider(id);
			} else {
				await confirmAppointmentAsProvider(id);
			}
			setBookingActionMsg('Actualizado correctamente.');
			await reloadBookings();
			/* Al confirmar, refrescar bloques: el hueco no vuelve a ofrecerse (y la lista queda alineada). */
			if (user?.providerType === 'veterinaria') {
				const s = await listMyAgendaSlots(undefined, buildSlotsListParams(agendaFrom, agendaTo));
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
			if (row.kind === 'cita_legacy') {
				await cancelCitaAsProvider(id, reason.trim());
			} else {
				await cancelAppointmentAsProvider(id, reason.trim());
			}
			setBookingActionMsg('Cancelación registrada.');
			await reloadBookings();
		} catch (err) {
			setBookingActionErr(err.response?.data?.message || 'No se pudo cancelar.');
		}
	}

	async function onCompleteWalker(row) {
		if (!window.confirm('¿Marcar este paseo o cuidado como completado?')) return;
		setBookingActionMsg('');
		setBookingActionErr('');
		const rawId = row.id;
		const id = rawId != null ? String(rawId) : '';
		if (!id) return;
		try {
			await completeWalkerAppointmentAsProvider(id);
			setBookingActionMsg('Servicio marcado como completado.');
			await reloadBookings();
		} catch (err) {
			setBookingActionErr(err.response?.data?.message || 'No se pudo completar.');
		}
	}

	function canConfirm(row) {
		if (row.kind === 'cita_legacy') return row.status === 'pendiente';
		return row.status === 'pending_confirmation';
	}

	function canCancel(row) {
		if (row.kind === 'cita_legacy') return ['pendiente', 'confirmada'].includes(row.status);
		return ['pending_confirmation', 'confirmed'].includes(row.status);
	}

	function canCompleteWalker(row) {
		if (row.kind === 'cita_legacy') return false;
		if (row.bookingSource !== 'walker_request') return false;
		return ['pending_confirmation', 'confirmed'].includes(row.status);
	}

	function canRecordDiagnostico(row) {
		return row.kind === 'cita_legacy' && row.status === 'confirmada';
	}

	function petIdString(row) {
		const p = row.petId;
		if (!p) return '';
		if (typeof p === 'object' && p._id) return String(p._id);
		return String(p);
	}

	const isVet = user.providerType === 'veterinaria';
	const isWalkerCare = user?.providerType === 'paseador' || user?.providerType === 'cuidador';
	const agendaStart = user?.providerProfile?.agendaSlotStart || '09:00';
	const agendaEnd = user?.providerProfile?.agendaSlotEnd || '18:00';

	function canRegisterClinical(row) {
		if (!isVet) return false;
		if (row.kind !== 'appointment') return false;
		if (!petIdString(row)) return false;
		return ['confirmed', 'completed'].includes(row.status);
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
								? 'Citas, líneas de atención (cada prof. o servicio) y tramos sueltos que el cliente reserva en línea.'
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

			<section className="edit-fieldset book-section provider-dash-section">
				<h2 id="reservas-calendario">
					{isVet ? 'Reservas, citas y calendario' : 'Reservas y citas'}
				</h2>
				{isVet ? (
					<>
						<p className="hint muted" style={{ marginTop: 0, maxWidth: '44rem' }}>
							<strong>Horas ya reservadas:</strong> aparecen en el calendario (línea de atención + nombre del
							 cliente) y en la tabla bajo con las acciones. <strong>Turno libre:</strong> mientras un tramo
							esté publicado, cualquiera puede tomarlo; al reservar, deja de figurar en «Tramos libres» (abajo) y
							<strong> pasa a esta lista y al calendario</strong>.
						</p>
						<ProviderClinicCalendar events={calendarEvents} />
						<p className="hint muted" style={{ margin: '0.5rem 0 0' }}>
							Acciones: confirmar o cancelar; desde citas de agenda, abrir ficha de atención.
						</p>
					</>
				) : (
					<p className="hint muted" style={{ marginTop: 0 }}>
						Confirmar o cancelar; en paseo y cuidado podrás marcar el servicio como completado.
					</p>
				)}
				{loadingBookings ? <p>Cargando…</p> : null}
				{error ? <p className='error'>{error}</p> : null}
				{bookingActionMsg ? <p className='review-success'>{bookingActionMsg}</p> : null}
				{bookingActionErr ? <p className='error'>{bookingActionErr}</p> : null}
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
									const isLegacy = row.kind === 'cita_legacy';
									const own = isLegacy ? row.dueno : row.owner;
									const st = isLegacy
										? CITA_ESTADO_LABELS[row.status] || row.status
										: APPOINTMENT_STATUS_LABELS[row.status] || row.status;
									const origin = isLegacy
										? 'Cita (histórico)'
										: BOOKING_SOURCE_LABELS[row.bookingSource] || row.bookingSource;
									let detail = '—';
									if (isLegacy) {
										const m = row.mascota;
										detail = [row.servicio, m ? `${m.nombre} (${m.especie})` : null]
											.filter(Boolean)
											.join(' · ');
									} else {
										const pet = row.pet;
										detail = [pet?.name, pet?.species, row.reason].filter(Boolean).join(' · ') || '—';
									}
									const showConfirm = canConfirm(row);
									const showCancel = canCancel(row);
									const showCompleteWalker = canCompleteWalker(row);
									const showDiagnostico = canRecordDiagnostico(row);
									const showClinical = canRegisterClinical(row);
									const pid = petIdString(row);
									const lineLabel = isVet
										? isLegacy
											? row.servicio || 'Cita (formulario clásico)'
											: row.clinicService?.displayName
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
												{showCompleteWalker ? (
													<button
														type='button'
														className='btn-complete btn-sm'
														onClick={() => onCompleteWalker(row)}
													>
														Completar
													</button>
												) : null}
												{showDiagnostico ? (
													<button type='button' className='btn-sm' onClick={() => onDiagnosticoCita(row)}>
														Diagnóstico
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
												{!showConfirm && !showCancel && !showCompleteWalker && !showDiagnostico && !showClinical ? (
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

					{isVet ? (
						<section
							className="edit-fieldset book-section"
							aria-labelledby="clinic-slots-heading"
						>
							<h2 id="clinic-slots-heading">2. Tramos libres (aún a la reserva pública)</h2>
							<p className="hint muted" style={{ marginTop: 0, maxWidth: '42rem' }}>
								Tras definir o <strong>añadir una línea</strong>, se generan tramos consecutivos en el
								horario de recepción (hoy a +8 semanas) sin paso extra. <strong>Al reservar un
								cliente</strong> ese tramo deja de verse aquí y pasa a <a href="#reservas-calendario">arriba</a>.
							</p>
							<div className="agenda-generate-form" style={{ marginTop: 8 }}>
								<div className="edit-row-2">
									<label className="edit-field">
										<span>Listar tramos: desde (fecha)</span>
										<input
											type="date"
											value={agendaFrom}
											onChange={(e) => setAgendaFrom(e.target.value)}
										/>
									</label>
									<label className="edit-field">
										<span>Hasta (fecha)</span>
										<input
											type="date"
											value={agendaTo}
											onChange={(e) => setAgendaTo(e.target.value)}
										/>
									</label>
								</div>
								<p className="muted" style={{ margin: '0.5rem 0 0', fontSize: '0.88rem' }}>
									Solo afecta <strong>esta</strong> lista. Vacía ambas para ver toda la agenda libre
									(futura).
								</p>
							</div>
							{agendaError ? (
								<p className="error" style={{ marginTop: 12 }} role="alert">
									{agendaError}
								</p>
							) : null}
							{agendaMsg && !agendaError ? <p className="review-success" style={{ marginTop: 12 }}>{agendaMsg}</p> : null}
							<details
								className="agenda-advanced-details"
								style={{ marginTop: 8, padding: '0.5rem 0' }}
							>
								<summary
									className="muted"
									style={{ cursor: 'pointer', fontSize: '0.95rem', listStyle: 'revert' }}
								>
									Si faltan tramos o quieres forzar un rellenado &mdash; o si quitaste turnos a mano
								</summary>
								<p className="hint muted" style={{ margin: '0.5rem 0' }}>
									Recrea tramos faltantes en hoy +8 semanas, respetando citas y borrados que indique el
									sistema. Si al borrar a mano el tramo dejó de salir, usa &quot;Permitir otra vez&quot;
									antes.
								</p>
								<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
									<form onSubmit={onForceFillAgenda} style={{ margin: 0 }}>
										<button type="submit" className="btn-sm" style={{ margin: 0 }}>
											Rellenar agenda ahora
										</button>
									</form>
									<form onSubmit={onClearOmittedAgenda} style={{ margin: 0 }}>
										<button type="submit" className="btn-sm">
											Permitir otra vez tramos que quité a mano
										</button>
									</form>
								</div>
							</details>
							<h3 style={{ margin: '1.25rem 0 0.5rem', fontSize: '1.1rem' }}>
								Tramos libres o cerrados
							</h3>
							<p className="muted" style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>
								Chile. Cada tramo = línea de atención + rango. Los <strong>reservados</strong> no se listan: están en
								<strong> calendario y tabla</strong>.
							</p>
							{loadingSlots ? <p>Cargando…</p> : null}
							{!loadingSlots && slots.length === 0 ? <p className="muted">No hay tramos en el rango elegido.</p> : null}
							<ul className="slot-admin-list">
								{slots.map((s) => {
									const lineName =
										s.clinicServiceId && typeof s.clinicServiceId === 'object'
											? s.clinicServiceId.displayName
											: null;
									return (
										<li key={String(s._id)}>
											<span>
												{lineName ? <strong className="slot-line-name">{lineName} · </strong> : null}
												{formatInChile(s.startAt)} — {formatTimeInChile(s.endAt)}{' '}
												<small className="muted">({s.status || '—'})</small>
											</span>
											{s.status === 'available' ? (
												<button type="button" className="btn-sm" onClick={() => onBlockSlot(s._id)}>
													Cerrar turno
												</button>
											) : null}
											{s.status === 'blocked' ? (
												<button type="button" className="btn-sm" onClick={() => onUnblockSlot(s._id)}>
													Abrir turno
												</button>
											) : null}
											<button type="button" className="btn-reject" onClick={() => onDeleteSlot(s._id)}>
												Quitar
											</button>
										</li>
									);
								})}
							</ul>
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
	);
}
