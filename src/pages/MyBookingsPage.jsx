import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchMyBookings } from '../services/bookings';
import { getProviderProfilePath, withResenaCitaParam } from '../services/providers';
import { cancelMyAppointment } from '../services/appointments';
import { cancelCitaAsOwner, rescheduleCita } from '../services/citas';
import {
	createReviewForAppointment,
	fetchReviewEligibility,
	updateMyReview
} from '../services/reviews';

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

function appointmentId(row) {
	if (!row) return '';
	return String(row.id ?? row._id ?? '');
}

/**
 * Muestra "Reseña" en acciones: estados en que solemos reseñar; el API valida el resto.
 */
function appointmentShowsReviewButton(row) {
	if (row.kind !== 'appointment') return false;
	const st = row.status;
	return st === 'completed' || st === 'confirmed';
}

/** Enlace con ?resenaCita= hacia el perfil (cualquier cita no cancelada, para reseñar o ver el motivo al entrar). */
function appointmentCanOpenProfileResenaLink(row) {
	if (row.kind !== 'appointment') return false;
	if (['cancelled_by_owner', 'cancelled_by_provider'].includes(row.status)) return false;
	return true;
}

export function MyBookingsPage() {
	const { user, loading: authLoading } = useAuth();
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [actionMsg, setActionMsg] = useState('');
	const [ownerReviewRow, setOwnerReviewRow] = useState(null);
	const [elig, setElig] = useState(null);
	const [eligLoading, setEligLoading] = useState(false);
	const [eligError, setEligError] = useState('');
	const [ownerForm, setOwnerForm] = useState({ rating: 5, comment: '' });
	const [ownerReviewSubmit, setOwnerReviewSubmit] = useState(false);
	const [ownerReviewMsg, setOwnerReviewMsg] = useState('');

	useEffect(() => {
		if (!ownerReviewRow || ownerReviewRow.kind !== 'appointment') {
			setElig(null);
			return;
		}
		const c = new AbortController();
		(async () => {
			setEligLoading(true);
			setEligError('');
			try {
				const e = await fetchReviewEligibility(appointmentId(ownerReviewRow), c.signal);
				setElig(e);
				if (e?.review) {
					setOwnerForm({ rating: e.review.rating, comment: e.review.comment || '' });
				} else {
					setOwnerForm({ rating: 5, comment: '' });
				}
			} catch (err) {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setEligError(err.response?.data?.message || 'No se pudo cargar el estado de la reseña.');
				setElig(null);
			} finally {
				setEligLoading(false);
			}
		})();
		return () => c.abort();
	}, [ownerReviewRow]);

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
			await cancelMyAppointment(appointmentId(row), reason.trim().slice(0, 200));
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

	function closeOwnerReview() {
		setOwnerReviewRow(null);
		setElig(null);
		setEligError('');
		setOwnerReviewMsg('');
	}

	async function submitOwnerReview() {
		if (!ownerReviewRow) return;
		const id = appointmentId(ownerReviewRow);
		if (!id) {
			setOwnerReviewMsg('No se pudo identificar la cita.');
			setOwnerReviewSubmit(false);
			return;
		}
		setOwnerReviewSubmit(true);
		setOwnerReviewMsg('');
		try {
			if (elig?.canReview) {
				const res = await createReviewForAppointment(id, {
					rating: Number(ownerForm.rating),
					comment: ownerForm.comment
				});
				setOwnerReviewMsg(res.message || 'Reseña publicada.');
			} else if (elig?.hasReview && elig.reviewId) {
				const res = await updateMyReview(String(elig.reviewId), {
					rating: Number(ownerForm.rating),
					comment: ownerForm.comment
				});
				setOwnerReviewMsg(res.message || 'Reseña actualizada.');
			} else {
				setOwnerReviewMsg('No se puede reseñar o editar en este momento.');
				setOwnerReviewSubmit(false);
				return;
			}
			await reloadBookings();
			try {
				const e = await fetchReviewEligibility(id);
				setElig(e);
				if (e?.review) {
					setOwnerForm({ rating: e.review.rating, comment: e.review.comment || '' });
				}
			} catch {
				// ok
			}
		} catch (err) {
			setOwnerReviewMsg(err.response?.data?.message || 'Error al guardar la reseña.');
		} finally {
			setOwnerReviewSubmit(false);
		}
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
			<p className='muted' style={{ maxWidth: '42rem' }}>
				Para reseñar, entra al perfil del servicio con <strong>Ingresar a la clínica y dejar reseña</strong>{' '}
				(agenda o paseo/cuidado) o abre <strong>Reseña</strong> en la fila. Las <strong>
					Cita (histórico)
				</strong>{' '}
				no usan el mismo sistema.
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
								const aid = appointmentId(row);
								const resenaPath =
									!isLegacy && href && aid
										? withResenaCitaParam(href, aid)
										: null;
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
									<tr key={`${row.kind}-${appointmentId(row) || row.id || row._id || 'row'}`}>
										<td>{formatRange(row.startAt, row.endAt)}</td>
										<td>{originLabel}</td>
										<td>
											{href ? (
												<div className="bookings-provider-cell">
													<Link to={href}>{providerLabel(prov)}</Link>
													{!isLegacy && resenaPath && appointmentCanOpenProfileResenaLink(row) ? (
														<div className="bookings-ingress">
															<Link to={resenaPath} className="bookings-ingress-link">
																Ingresar a la clínica y dejar reseña
															</Link>
														</div>
													) : null}
												</div>
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
											{row.kind === 'appointment' && appointmentShowsReviewButton(row) ? (
												<button
													type='button'
													className='btn-sm'
													onClick={() => {
														setOwnerReviewRow(row);
													}}
												>
													Reseña
												</button>
											) : null}
											{!(
												(row.kind === 'appointment' && canCancelOwner(row)) ||
												(row.kind === 'cita_legacy' && canCancelOwner(row)) ||
												canRescheduleLegacy(row) ||
												(row.kind === 'appointment' && appointmentShowsReviewButton(row))
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

			{ownerReviewRow ? (
				<div
					className="report-modal-backdrop"
					role="presentation"
					onClick={() => {
						if (!ownerReviewSubmit) closeOwnerReview();
					}}
				>
					<div
						className="report-modal"
						role="dialog"
						aria-modal="true"
						aria-labelledby="owner-review-title"
						onClick={(e) => e.stopPropagation()}
					>
						<h3 id="owner-review-title">Reseña del servicio</h3>
						<p className="muted" style={{ fontSize: '0.9rem' }}>
							{formatRange(ownerReviewRow.startAt, ownerReviewRow.endAt)} — {providerLabel(ownerReviewRow.provider)}
						</p>
						{eligLoading ? <p>Cargando…</p> : null}
						{eligError ? <p className="error">{eligError}</p> : null}
						{!eligLoading && elig && !elig.canReview && !elig.hasReview ? (
							<p className="muted">
								Esta cita aún no califica para reseña (estado: {elig.appointmentStatus || '—'}). Tras
								finalizar, podrás dejar tu opinión.
							</p>
						) : null}
						{!eligLoading && elig && (elig.canReview || elig.hasReview) ? (
							<form
								className="review-form"
								onSubmit={(e) => {
									e.preventDefault();
									void submitOwnerReview();
								}}
							>
								<label className="review-field">
									<span>Calificación</span>
									<select
										value={ownerForm.rating}
										onChange={(e) =>
											setOwnerForm((f) => ({ ...f, rating: Number(e.target.value) }))
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
									<span>Comentario (opcional)</span>
									<textarea
										value={ownerForm.comment}
										onChange={(e) => setOwnerForm((f) => ({ ...f, comment: e.target.value }))}
										rows={3}
										maxLength={2000}
									/>
								</label>
								{elig.hasReview ? (
									<p className="muted" style={{ fontSize: '0.85rem' }}>
										Solo puedes editar en las 24 h posteriores a publicar (lo valida el servidor).
									</p>
								) : null}
								{ownerReviewMsg ? <p className="review-success">{ownerReviewMsg}</p> : null}
								<div className="report-modal-actions">
									<button
										type="button"
										className="btn-sm"
										onClick={closeOwnerReview}
										disabled={ownerReviewSubmit}
									>
										Cerrar
									</button>
									<button type="submit" className="review-submit" disabled={ownerReviewSubmit}>
										{ownerReviewSubmit ? 'Guardando…' : elig.hasReview ? 'Guardar cambios' : 'Publicar reseña'}
									</button>
								</div>
							</form>
						) : null}
					</div>
				</div>
			) : null}
		</div>
	);
}
