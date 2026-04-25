import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getStoredAuthToken } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { createReviewForAppointment, fetchReviewEligibility, updateMyReview } from '../services/reviews';

/**
 * Formulario de reseña vinculado a una cita (`Appointment`), p. ej. con `?resenaCita=` en el perfil del proveedor.
 */
export function OwnerAppointmentReviewPanel({ appointmentId, providerName, onReviewSaved }) {
	const { user } = useAuth();
	const location = useLocation();
	const [elig, setElig] = useState(null);
	const [eligLoading, setEligLoading] = useState(true);
	const [eligError, setEligError] = useState('');
	const [form, setForm] = useState({ rating: 5, comment: '' });
	const [submitting, setSubmitting] = useState(false);
	const [msg, setMsg] = useState('');

	const load = useCallback(
		async (signal) => {
			if (!appointmentId) return;
			setEligLoading(true);
			setEligError('');
			try {
				const e = await fetchReviewEligibility(appointmentId, signal);
				setElig(e);
				if (e?.review) {
					setForm({
						rating: e.review.rating,
						comment: e.review.comment || e.review.observation || ''
					});
				} else {
					setForm({ rating: 5, comment: '' });
				}
			} catch (err) {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setEligError(err.response?.data?.message || 'No se pudo verificar la cita.');
				setElig(null);
			} finally {
				setEligLoading(false);
			}
		},
		[appointmentId]
	);

	useEffect(() => {
		if (!appointmentId) return;
		const c = new AbortController();
		void load(c.signal);
		return () => c.abort();
	}, [appointmentId, load]);

	async function onSubmit(e) {
		e.preventDefault();
		if (!elig || !appointmentId) return;
		setSubmitting(true);
		setMsg('');
		try {
			if (elig.canReview) {
				await createReviewForAppointment(appointmentId, {
					rating: Number(form.rating),
					comment: form.comment
				});
				setMsg('Reseña publicada.');
			} else if (elig.hasReview && elig.reviewId) {
				if (elig.canEdit === false) {
					setMsg('El plazo de edición (24 h) expiró.');
					setSubmitting(false);
					return;
				}
				await updateMyReview(String(elig.reviewId), {
					rating: Number(form.rating),
					comment: form.comment
				});
				setMsg('Reseña actualizada.');
			} else {
				setMsg('No se puede reseñar aún.');
				setSubmitting(false);
				return;
			}
			const e2 = await fetchReviewEligibility(appointmentId);
			setElig(e2);
			if (e2?.review) {
				setForm({
					rating: e2.review.rating,
					comment: e2.review.comment || e2.review.observation || ''
				});
			}
			onReviewSaved?.();
		} catch (err) {
			setMsg(err.response?.data?.message || 'Error al guardar la reseña.');
		} finally {
			setSubmitting(false);
		}
	}

	if (!appointmentId) return null;

	if (!getStoredAuthToken() || !user) {
		return (
			<section className="profile-section owner-appointment-review-card">
				<h2>Reseña de tu cita</h2>
				<p className="muted">Inicia sesión como dueño para evaluar este servicio.</p>
				<p>
					<Link to="/login" replace={false} state={{ from: location }}>
						Iniciar sesión
					</Link>
				</p>
			</section>
		);
	}

	if (user.role !== 'dueno') {
		return null;
	}

	return (
		<section className="profile-section owner-appointment-review-card">
			<h2>Reseña de tu visita{providerName ? ` — ${providerName}` : ''}</h2>
			<p className="muted">
				Reseña vinculada a tu cita en PetConnect. Si aún no aplica, revisa el mensaje o vuelve más tarde.
			</p>
			{eligLoading ? <p>Cargando…</p> : null}
			{eligError ? <p className="error">{eligError}</p> : null}
			{!eligLoading && elig && !elig.canReview && !elig.hasReview ? (
				<p className="muted">
					Todavía no puedes dejar reseña (estado de la cita: {elig.appointmentStatus || '—'}). Cuando el
					servicio quede finalizado, podrás publicarla aquí.
				</p>
			) : null}
			{!eligLoading && elig && (elig.canReview || elig.hasReview) ? (
				elig.hasReview && elig.canEdit === false ? (
					<div>
						<p>
							<strong>Calificación:</strong> {form.rating} / 5
						</p>
						{form.comment ? (
							<p>
								<strong>Observación:</strong> {form.comment}
							</p>
						) : null}
						<p className="muted" style={{ fontSize: '0.9rem' }}>
							La edición solo estuvo disponible 24 h tras publicar.
						</p>
					</div>
				) : (
					<form className="review-form" onSubmit={onSubmit}>
						<label className="review-field">
							<span>Calificación (estrellas)</span>
							<select
								value={form.rating}
								onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))}
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
								value={form.comment}
								onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
								rows={3}
								maxLength={200}
								placeholder="Breve comentario sobre el servicio"
							/>
						</label>
						{elig.hasReview ? (
							<p className="muted" style={{ fontSize: '0.85rem' }}>
								Solo puedes editar en las 24 h posteriores a publicar (lo valida el servidor).
							</p>
						) : null}
						{msg ? <p className="review-success">{msg}</p> : null}
						<button type="submit" className="review-submit" disabled={submitting}>
							{submitting ? 'Guardando…' : elig.hasReview ? 'Guardar cambios' : 'Publicar reseña'}
						</button>
					</form>
				)
			) : null}
		</section>
	);
}
