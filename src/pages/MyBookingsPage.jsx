import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchMyBookings } from '../services/bookings';
import { getProviderProfilePath } from '../services/providers';
import { cancelMyAppointment } from '../services/appointments';
import { cancelCitaAsOwner, rescheduleCita } from '../services/citas';

const APPOINTMENT_STATUS_LABELS = {
	pending_confirmation: 'Pendiente de confirmación',
	confirmed: 'Confirmada',
	cancelled_by_owner: 'Cancelada por ti',
	cancelled_by_provider: 'Cancelada por el proveedor',
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
	availability_slot: 'Reserva por agenda',
	legacy_cita: 'Cita (sincronizada)',
	walker_request: 'Solicitud paseo / cuidado'
};

function formatRange(startAt, endAt) {
	if (!startAt) return '—';
	try {
		const s = new Date(startAt);
		const e = endAt ? new Date(endAt) : null;
		const opts = { dateStyle: 'medium', timeStyle: 'short' };
		const a = s.toLocaleString('es-CL', opts);
		if (!e || e.getTime() === s.getTime()) return a;
		const sameDay =
			s.getFullYear() === e.getFullYear() &&
			s.getMonth() === e.getMonth() &&
			s.getDate() === e.getDate();
		const b = sameDay
			? e.toLocaleTimeString('es-CL', { timeStyle: 'short' })
			: e.toLocaleString('es-CL', opts);
		return `${a} — ${b}`;
	} catch {
		return '—';
	}
}

function providerLabel(p) {
	if (!p) return '—';
	const n = `${p.name || ''} ${p.lastName || ''}`.trim();
	return n || 'Proveedor';
}

function providerLinkTarget(p) {
	if (!p) return null;
	const id = p._id || p.id;
	if (!id) return null;
	return getProviderProfilePath({
		id: String(id),
		providerType: p.providerType
	});
}

function statusBadgeClass(status) {
	const s = String(status || '');
	if (s.includes('cancel')) return 'booking-status cancelled';
	if (s === 'completed' || s === 'completada') return 'booking-status done';
	if (s === 'pending_confirmation' || s === 'pendiente') return 'booking-status pending';
	return 'booking-status ok';
}

export function MyBookingsPage() {
	const { user, loading: authLoading } = useAuth();
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [actionMsg, setActionMsg] = useState('');

	useEffect(() => {
		if (authLoading || !user || user.role !== 'dueno') return;
		const c = new AbortController();
		(async () => {
			try {
				setLoading(true);
				setError('');
				const res = await fetchMyBookings(c.signal);
				setData(res);
			} catch (err) {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setError(err.response?.data?.message || 'No se pudieron cargar las reservas.');
				setData(null);
			} finally {
				setLoading(false);
			}
		})();
		return () => c.abort();
	}, [authLoading, user]);

	async function reloadBookings() {
		try {
			const res = await fetchMyBookings();
			setData(res);
		} catch {
			// ignore
		}
	}

	async function onCancelAppointment(row) {
		const reason = window.prompt('Motivo de la cancelación (obligatorio):');
		if (!reason || !reason.trim()) return;
		setActionMsg('');
		try {
			await cancelMyAppointment(String(row.id), reason.trim().slice(0, 200));
			setActionMsg('Cita cancelada.');
			await reloadBookings();
		} catch (err) {
			setActionMsg(err.response?.data?.message || 'No se pudo cancelar.');
		}
	}

	async function onCancelCitaLegacy(row) {
		if (!window.confirm('¿Cancelar esta cita?')) return;
		setActionMsg('');
		try {
			await cancelCitaAsOwner(String(row.id));
			setActionMsg('Cita cancelada.');
			await reloadBookings();
		} catch (err) {
			setActionMsg(err.response?.data?.message || 'No se pudo cancelar.');
		}
	}

	async function onRescheduleCita(row) {
		const local = window.prompt('Nueva fecha y hora (ej. 2026-05-01T15:00 en hora local):');
		if (!local || !local.trim()) return;
		const d = new Date(local.trim());
		if (Number.isNaN(d.getTime())) {
			setActionMsg('Fecha inválida.');
			return;
		}
		setActionMsg('');
		try {
			await rescheduleCita(String(row.id), d.toISOString());
			setActionMsg('Cita reagendada.');
			await reloadBookings();
		} catch (err) {
			setActionMsg(err.response?.data?.message || 'No se pudo reagendar.');
		}
	}

	function canCancelOwner(row) {
		if (row.kind === 'cita_legacy') {
			return ['pendiente', 'confirmada'].includes(row.status);
		}
		if (row.kind === 'appointment') {
			return ['pending_confirmation', 'confirmed'].includes(row.status);
		}
		return false;
	}

	function canRescheduleLegacy(row) {
		return row.kind === 'cita_legacy' && ['pendiente', 'confirmada'].includes(row.status);
	}

	if (authLoading) {
		return (
			<div className='page'>
				<p>Cargando…</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to='/login' replace state={{ from: '/mis-reservas' }} />;
	}

	if (user.role !== 'dueno') {
		return (
			<div className='page'>
				<Link className='back-link' to='/'>
					Volver al mapa
				</Link>
				<p className='error'>Mis reservas solo está disponible para cuentas de dueño.</p>
			</div>
		);
	}

	const items = Array.isArray(data?.items) ? data.items : [];

	return (
		<div className='page bookings-page'>
			<Link className='back-link' to='/'>
				Volver al mapa
			</Link>
			<h1>Mis reservas</h1>
			<p className='muted'>
				Agenda, solicitudes a paseadores/cuidadores y citas anteriores en un solo listado.
			</p>
			<p className='muted'>
				<Link to='/citas'>Próximas citas (legacy)</Link> · <Link to='/mi-perfil'>Mi perfil</Link> ·{' '}
				<Link to='/mascotas'>Mis mascotas</Link>
			</p>

			{loading ? <p>Cargando reservas…</p> : null}
			{error ? <p className='error'>{error}</p> : null}
			{actionMsg ? <p className='review-success'>{actionMsg}</p> : null}

			{!loading && !error && items.length === 0 ? (
				<p className='bookings-empty'>Aún no tienes reservas registradas.</p>
			) : null}

			{!loading && items.length > 0 ? (
				<div className='bookings-table-wrap'>
					<table className='bookings-table'>
						<thead>
							<tr>
								<th>Fecha</th>
								<th>Origen</th>
								<th>Proveedor</th>
								<th>Detalle</th>
								<th>Estado</th>
								<th>Acciones</th>
							</tr>
						</thead>
						<tbody>
							{items.map((row) => {
								const isLegacy = row.kind === 'cita_legacy';
								const prov = isLegacy ? row.proveedor : row.provider;
								const href = providerLinkTarget(prov);
								const statusLabel = isLegacy
									? CITA_ESTADO_LABELS[row.status] || row.status
									: APPOINTMENT_STATUS_LABELS[row.status] || row.status;
								const originLabel = isLegacy
									? 'Cita (histórico)'
									: BOOKING_SOURCE_LABELS[row.bookingSource] || row.bookingSource || '—';

								let detail = '—';
								if (isLegacy) {
									const m = row.mascota;
									detail = [row.servicio, m ? `${m.nombre} (${m.especie})` : null]
										.filter(Boolean)
										.join(' · ');
								} else {
									const pet = row.pet;
									const petStr = pet?.name
										? `${pet.name}${pet.species ? ` (${pet.species})` : ''}`
										: null;
									detail = [petStr, row.reason].filter(Boolean).join(' · ') || '—';
								}

								return (
									<tr key={`${row.kind}-${row.id}`}>
										<td>{formatRange(row.startAt, row.endAt)}</td>
										<td>{originLabel}</td>
										<td>
											{href ? (
												<Link to={href}>{providerLabel(prov)}</Link>
											) : (
												providerLabel(prov)
											)}
										</td>
										<td className='bookings-detail'>{detail}</td>
										<td>
											<span className={statusBadgeClass(row.status)}>{statusLabel}</span>
										</td>
										<td className='owner-booking-actions'>
											{canCancelOwner(row) && row.kind === 'appointment' ? (
												<button type='button' className='btn-reject btn-sm' onClick={() => onCancelAppointment(row)}>
													Cancelar reserva
												</button>
											) : null}
											{canCancelOwner(row) && row.kind === 'cita_legacy' ? (
												<button type='button' className='btn-reject btn-sm' onClick={() => onCancelCitaLegacy(row)}>
													Cancelar cita
												</button>
											) : null}
											{canRescheduleLegacy(row) ? (
												<button type='button' className='btn-sm' onClick={() => onRescheduleCita(row)}>
													Reagendar
												</button>
											) : null}
											{!(
												(row.kind === 'appointment' && canCancelOwner(row)) ||
												(row.kind === 'cita_legacy' && canCancelOwner(row)) ||
												canRescheduleLegacy(row)
											) ? (
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

			{import.meta.env.DEV && data?.note ? (
				<p className='bookings-api-note muted'>
					<small>Nota API: {data.note}</small>
				</p>
			) : null}
		</div>
	);
}
