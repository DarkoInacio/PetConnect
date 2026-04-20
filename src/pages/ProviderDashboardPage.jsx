import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
	confirmAppointmentAsProvider,
	cancelAppointmentAsProvider,
	completeWalkerAppointmentAsProvider
} from '../services/appointments';
import {
	blockAgendaSlot,
	deleteAgendaSlot,
	generateAgendaSlots,
	listMyAgendaSlots,
	unblockAgendaSlot
} from '../services/agenda';
import { fetchProviderBookings } from '../services/bookings';
import { cancelCitaAsProvider, confirmCitaAsProvider, recordCitaDiagnostico } from '../services/citas';

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
	if (!startAt) return '—';
	try {
		const s = new Date(startAt);
		const e = endAt ? new Date(endAt) : null;
		const opts = { dateStyle: 'medium', timeStyle: 'short' };
		const a = s.toLocaleString('es-CL', opts);
		if (!e) return a;
		const b = e.toLocaleString('es-CL', opts);
		return `${a} — ${b}`;
	} catch {
		return '—';
	}
}

function ownerLabel(o) {
	if (!o) return '—';
	return `${o.name || ''} ${o.lastName || ''}`.trim() || 'Dueño';
}

export function ProviderDashboardPage() {
	const { user, loading: authLoading } = useAuth();
	const [bookings, setBookings] = useState([]);
	const [slots, setSlots] = useState([]);
	const [loadingBookings, setLoadingBookings] = useState(true);
	const [loadingSlots, setLoadingSlots] = useState(true);
	const [error, setError] = useState('');
	const [agendaFrom, setAgendaFrom] = useState('');
	const [agendaTo, setAgendaTo] = useState('');
	const [agendaMsg, setAgendaMsg] = useState('');
	const [bookingActionMsg, setBookingActionMsg] = useState('');
	const [bookingActionErr, setBookingActionErr] = useState('');

	const reloadBookings = useCallback(async () => {
		const b = await fetchProviderBookings();
		setBookings(Array.isArray(b.items) ? b.items : []);
	}, []);

	useEffect(() => {
		if (authLoading || !user || user.role !== 'proveedor') return;
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
		if (authLoading || !user || user.role !== 'proveedor') return;
		const c = new AbortController();
		(async () => {
			try {
				setLoadingSlots(true);
				const s = await listMyAgendaSlots(c.signal);
				setSlots(Array.isArray(s.slots) ? s.slots : []);
			} catch {
				setSlots([]);
			} finally {
				setLoadingSlots(false);
			}
		})();
		return () => c.abort();
	}, [authLoading, user]);

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

	if (user.role !== 'proveedor') {
		return (
			<div className='page'>
				<Link className='back-link' to='/'>
					Inicio
				</Link>
				<p className='error'>Solo proveedores.</p>
			</div>
		);
	}

	async function onGenerateAgenda(e) {
		e.preventDefault();
		setAgendaMsg('');
		try {
			const body = {};
			if (agendaFrom.trim()) body.fromDate = agendaFrom.trim();
			if (agendaTo.trim()) body.toDate = agendaTo.trim();
			const res = await generateAgendaSlots(body);
			setAgendaMsg(res.message || 'Bloques generados.');
			const s = await listMyAgendaSlots();
			setSlots(Array.isArray(s.slots) ? s.slots : []);
		} catch (err) {
			setAgendaMsg(err.response?.data?.message || 'No se pudo generar la agenda.');
		}
	}

	async function onDeleteSlot(id) {
		if (!window.confirm('¿Eliminar este bloque disponible?')) return;
		try {
			await deleteAgendaSlot(id);
			const s = await listMyAgendaSlots();
			setSlots(Array.isArray(s.slots) ? s.slots : []);
		} catch (err) {
			setAgendaMsg(err.response?.data?.message || 'No se pudo eliminar.');
		}
	}

	async function onBlockSlot(id) {
		try {
			await blockAgendaSlot(id);
			const s = await listMyAgendaSlots();
			setSlots(Array.isArray(s.slots) ? s.slots : []);
		} catch (err) {
			setAgendaMsg(err.response?.data?.message || 'No se pudo bloquear.');
		}
	}

	async function onUnblockSlot(id) {
		try {
			await unblockAgendaSlot(id);
			const s = await listMyAgendaSlots();
			setSlots(Array.isArray(s.slots) ? s.slots : []);
		} catch (err) {
			setAgendaMsg(err.response?.data?.message || 'No se pudo desbloquear.');
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

	function canRegisterClinical(row) {
		if (!isVet) return false;
		if (row.kind !== 'appointment') return false;
		if (!petIdString(row)) return false;
		return ['confirmed', 'completed'].includes(row.status);
	}

	return (
		<div className='page provider-dashboard'>
			<Link className='back-link' to='/'>
				Mapa
			</Link>
			<h1>Panel proveedor</h1>
			<p className='muted'>
				Estado: <strong>{user.status}</strong> · Tipo: <strong>{user.providerType}</strong>
			</p>
			<p>
				<Link to='/proveedor/mi-perfil'>Editar perfil público</Link>
			</p>

			<section className='edit-fieldset book-section'>
				<h2>Reservas y citas donde eres el profesional</h2>
				<p className='hint muted'>
					Puedes confirmar o cancelar solicitudes pendientes. Si la reserva ya estaba confirmada, la
					cancelación del proveedor requiere al menos 2 horas de anticipación (misma regla que el dueño).
					Las solicitudes de paseo o cuidado pueden marcarse como completadas cuando el servicio ya se
					realizó (no aplica a citas clásicas ni a agenda veterinaria).
				</p>
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
									<th>Origen</th>
									<th>Cliente</th>
									<th>Detalle</th>
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
									return (
										<tr key={`${row.kind}-${row.id}`}>
											<td>{formatRange(row.startAt, row.endAt)}</td>
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

			{isVet ? (
				<section className='edit-fieldset book-section'>
					<h2>Agenda (bloques de 30 min, 09:00–18:00)</h2>
					<p className='hint muted'>Solo veterinarias aprobadas pueden generar bloques.</p>
					<form className='agenda-generate-form' onSubmit={onGenerateAgenda}>
						<div className='edit-row-2'>
							<label className='edit-field'>
								<span>Desde (YYYY-MM-DD, opcional)</span>
								<input type='date' value={agendaFrom} onChange={(e) => setAgendaFrom(e.target.value)} />
							</label>
							<label className='edit-field'>
								<span>Hasta (opcional)</span>
								<input type='date' value={agendaTo} onChange={(e) => setAgendaTo(e.target.value)} />
							</label>
						</div>
						<button type='submit' className='save-profile-btn'>
							Generar / rellenar bloques
						</button>
					</form>
					{agendaMsg ? <p className='review-success'>{agendaMsg}</p> : null}
					<h3>Bloques disponibles actuales</h3>
					{loadingSlots ? <p>Cargando…</p> : null}
					{!loadingSlots && slots.length === 0 ? <p className='muted'>No hay bloques futuros libres.</p> : null}
					<ul className='slot-admin-list'>
						{slots.map((s) => (
							<li key={String(s._id)}>
								<span>
									{new Date(s.startAt).toLocaleString('es-CL')} —{' '}
									{new Date(s.endAt).toLocaleTimeString('es-CL', { timeStyle: 'short' })}{' '}
									<small className='muted'>({s.status || '—'})</small>
								</span>
								{s.status === 'available' ? (
									<button type='button' className='btn-sm' onClick={() => onBlockSlot(s._id)}>
										Bloquear
									</button>
								) : null}
								{s.status === 'blocked' ? (
									<button type='button' className='btn-sm' onClick={() => onUnblockSlot(s._id)}>
										Desbloquear
									</button>
								) : null}
								<button type='button' className='btn-reject' onClick={() => onDeleteSlot(s._id)}>
									Eliminar
								</button>
							</li>
						))}
					</ul>
				</section>
			) : (
				<p className='muted'>La generación de bloques por agenda aplica solo a veterinarias.</p>
			)}
		</div>
	);
}
