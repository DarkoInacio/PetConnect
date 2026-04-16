import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchMyBookings } from '../services/bookings';
import { getProviderProfilePath } from '../services/providers';

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

			{loading ? <p>Cargando reservas…</p> : null}
			{error ? <p className='error'>{error}</p> : null}

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
