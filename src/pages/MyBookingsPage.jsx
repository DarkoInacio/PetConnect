import { useEffect, useState } from 'react';
import { Link, Navigate, useOutletContext } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { fetchMyBookings } from '../services/bookings';
import { getProviderProfilePath } from '../services/providers';
import { cancelMyAppointment } from '../services/appointments';
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

const BOOKING_SOURCE_LABELS = {
	availability_slot: 'Reserva por agenda',
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
	if (s === 'completed') return 'booking-status done';
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

function getBookingRowMeta(row) {
	const prov = row.provider;
	const href = providerLinkTarget(prov);
	const statusLabel = APPOINTMENT_STATUS_LABELS[row.status] || row.status;
	const originLabel = BOOKING_SOURCE_LABELS[row.bookingSource] || row.bookingSource || '—';
	const pet = row.pet;
	const petStr = pet?.name
		? `${pet.name}${pet.species ? ` (${pet.species})` : ''}`
		: null;
	const detail = [petStr, row.reason].filter(Boolean).join(' · ') || '—';
	return { prov, href, statusLabel, originLabel, detail };
}

export function MyBookingsPage() {
	const { setSubnavSuppressed } = useOutletContext() || {};
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
					setOwnerForm({
						rating: e.review.rating,
						comment: e.review.comment || e.review.observation || ''
					});
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
		if (typeof setSubnavSuppressed === 'function') {
			setSubnavSuppressed(Boolean(ownerReviewRow));
			return () => setSubnavSuppressed(false);
		}
		return undefined;
	}, [ownerReviewRow, setSubnavSuppressed]);

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
			setActionMsg('Reserva cancelada.');
			await reloadBookings();
		} catch (err) {
			setActionMsg(err.response?.data?.message || 'No se pudo cancelar.');
		}
	}

	function canCancelOwner(row) {
		if (row.kind !== 'appointment') return false;
		return ['pending_confirmation', 'confirmed'].includes(row.status);
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
				if (elig.canEdit === false) {
					setOwnerReviewMsg('El plazo de edición (24 h) expiró.');
					setOwnerReviewSubmit(false);
					return;
				}
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
					setOwnerForm({
						rating: e.review.rating,
						comment: e.review.comment || e.review.observation || ''
					});
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

	function renderOwnerBookingActions(row) {
		const showReview = row.kind === 'appointment' && appointmentShowsReviewButton(row);
		const hasAny = (row.kind === 'appointment' && canCancelOwner(row)) || showReview;
		return (
			<>
				{canCancelOwner(row) && row.kind === 'appointment' ? (
					<button type="button" className="btn-reject btn-sm" onClick={() => onCancelAppointment(row)}>
						Cancelar reserva
					</button>
				) : null}
				{showReview ? (
					<button
						type="button"
						className="btn-sm"
						onClick={() => {
							setOwnerReviewRow(row);
						}}
					>
						Reseña
					</button>
				) : null}
				{!hasAny ? <span className="muted">—</span> : null}
			</>
		);
	}

	if (authLoading) {
		return (
			<div className="page">
				<div className="page-surface" role="status" aria-live="polite">
					<p className="muted" style={{ margin: 0 }}>
						Cargando…
					</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return <Navigate to='/login' replace state={{ from: '/cuenta/reservas' }} />;
	}

	if (user.role !== 'dueno') {
		return (
			<div className="page">
				<div className="auth-page-stack" style={{ maxWidth: '28rem' }}>
					<Link className="back-link" to="/">
						← Volver al mapa
					</Link>
					<div className="page-surface">
						<p className="error" style={{ margin: 0 }} role="alert">
							Mis reservas solo está disponible para cuentas de dueño.
						</p>
					</div>
				</div>
			</div>
		);
	}

	const items = Array.isArray(data?.items) ? data.items : [];

	return (
		<div className="bookings-page owner-hub-section">
			<div className="page-surface page-surface--bookings app-form">
				<header className="page-hero">
					<h1>Reservas</h1>
					<p>Agenda, solicitudes a paseadores o cuidadores e historial, todo en un solo lugar.</p>
				</header>
				<p className="muted" style={{ maxWidth: '42rem', marginTop: '0.5rem' }}>
					Aquí ves el historial: reseñas a veterinarios, cuidadores y paseadores tras un servicio{' '}
					<strong>completado</strong>. Puntuación con estrellas y observación (opcional, hasta 200
					caracteres). La reseña se hace con el botón en cada fila; mientras reseñas, el resto de pestañas
					de tu cuenta se oculta.
				</p>

				{loading ? (
					<p className="muted" style={{ margin: 0 }} role="status" aria-live="polite">
						Cargando reservas…
					</p>
				) : null}
				{error ? (
					<p className="error" role="alert" aria-live="assertive" style={{ margin: '0 0 1rem' }}>
						{error}
					</p>
				) : null}
				{actionMsg ? <p className="review-success">{actionMsg}</p> : null}

				{!loading && !error && items.length === 0 ? (
					<div className="bookings-empty-state" role="status">
						<Calendar
							className="bookings-empty-ico"
							aria-hidden
							strokeWidth={1.5}
							size={40}
						/>
						<p className="bookings-empty-title">Aún no tienes reservas</p>
						<p style={{ margin: 0, fontSize: '0.95rem' }}>
							Explora el mapa, elige un proveedor y agenda tu primera cita o servicio.
						</p>
					</div>
				) : null}

				{!loading && items.length > 0 ? (
					<div className="bookings-cards bookings-cards--mobile" aria-label="Vista móvil de reservas">
						{items.map((row) => {
							const m = getBookingRowMeta(row);
							const aid = appointmentId(row);
							return (
								<article
									key={`card-${row.kind}-${aid || row.id || row._id || 'row'}`}
									className="booking-card"
								>
									<p className="booking-card__label">Fecha y hora</p>
									<p className="booking-card__value">{formatRange(row.startAt, row.endAt)}</p>
									<p className="booking-card__label">Proveedor</p>
									<div className="booking-card__value">
										{m.href ? <Link to={m.href}>{providerLabel(m.prov)}</Link> : providerLabel(m.prov)}
									</div>
									<p className="booking-card__label">Origen</p>
									<p className="booking-card__value">{m.originLabel}</p>
									<p className="booking-card__label">Detalle</p>
									<p className="booking-card__value">{m.detail}</p>
									<p className="booking-card__label">Estado</p>
									<p className="booking-card__value">
										<span className={statusBadgeClass(row.status)}>{m.statusLabel}</span>
									</p>
									<div className="booking-card__actions owner-booking-actions">
										{renderOwnerBookingActions(row)}
									</div>
								</article>
							);
						})}
					</div>
				) : null}

				{!loading && items.length > 0 ? (
					<div
						className="bookings-table-wrap bookings-table-desktop"
						role="region"
						aria-label="Tabla de reservas"
					>
						<table className="bookings-table">
							<thead>
								<tr>
									<th scope="col">Fecha</th>
									<th scope="col">Origen</th>
									<th scope="col">Proveedor</th>
									<th scope="col">Detalle</th>
									<th scope="col">Estado</th>
									<th scope="col">Acciones</th>
								</tr>
							</thead>
							<tbody>
								{items.map((row) => {
									const m = getBookingRowMeta(row);
									const aid = appointmentId(row);
									return (
										<tr key={`${row.kind}-${aid || row.id || row._id || 'row'}`}>
											<td>{formatRange(row.startAt, row.endAt)}</td>
											<td>{m.originLabel}</td>
											<td>{m.href ? <Link to={m.href}>{providerLabel(m.prov)}</Link> : providerLabel(m.prov)}</td>
											<td className="bookings-detail">{m.detail}</td>
											<td>
												<span className={statusBadgeClass(row.status)}>{m.statusLabel}</span>
											</td>
											<td className="owner-booking-actions">{renderOwnerBookingActions(row)}</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				) : null}
			</div>

			{import.meta.env.DEV && data?.note ? (
				<p className="bookings-api-note--dev">
					<strong>Nota (solo desarrollo):</strong> {data.note}
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
							elig.hasReview && elig.canEdit === false ? (
								<div>
									<p>
										<strong>Calificación:</strong> {ownerForm.rating} / 5
									</p>
									{ownerForm.comment ? (
										<p>
											<strong>Observación:</strong> {ownerForm.comment}
										</p>
									) : null}
									<p className="muted" style={{ fontSize: '0.9rem' }}>
										La edición del texto y las estrellas solo estuvo disponible durante 24 h tras
										publicar.
									</p>
									<div className="report-modal-actions">
										<button type="button" className="btn-sm" onClick={closeOwnerReview}>
											Cerrar
										</button>
									</div>
								</div>
							) : (
							<form
								className="review-form"
								onSubmit={(e) => {
									e.preventDefault();
									void submitOwnerReview();
								}}
							>
								<label className="review-field">
									<span>Calificación (estrellas)</span>
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
									<span>Observación (opcional, máx. 200 caracteres)</span>
									<textarea
										value={ownerForm.comment}
										onChange={(e) => setOwnerForm((f) => ({ ...f, comment: e.target.value }))}
										rows={3}
										maxLength={200}
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
							)
						) : null}
					</div>
				</div>
			) : null}
		</div>
	);
}
