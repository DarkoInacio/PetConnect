import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchProviderOwnReviews, upsertProviderReply } from '../services/reviews';

function formatDate(iso) {
	if (!iso) return '—';
	try {
		return new Date(iso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });
	} catch {
		return '—';
	}
}

function Stars({ value }) {
	const n = Math.min(5, Math.max(0, Number(value) || 0));
	return <span className="review-stars">{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

function ownerLine(owner) {
	if (!owner) return 'Dueño';
	const s = [owner.name, owner.lastName].filter(Boolean).join(' ').trim();
	return s || 'Dueño';
}

function replyValue(r, draft, id) {
	if (draft[id] !== undefined) return draft[id];
	const t = r.providerReply?.text;
	return t != null ? String(t) : '';
}

export function ProviderReviewsPage() {
	const { user, loading: authLoading } = useAuth();
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [actionMsg, setActionMsg] = useState('');
	const [replyDraft, setReplyDraft] = useState({});
	const [submittingId, setSubmittingId] = useState('');

	const reload = useCallback(async () => {
		const res = await fetchProviderOwnReviews(undefined, { prioridad: 'pendientes' });
		setData(res);
	}, []);

	useEffect(() => {
		if (authLoading || !user || user.role !== 'proveedor') return;
		let cancel = false;
		(async () => {
			try {
				setLoading(true);
				setError('');
				await reload();
			} catch (err) {
				if (!cancel) setError(err.response?.data?.message || 'No se pudieron cargar las reseñas.');
			} finally {
				if (!cancel) setLoading(false);
			}
		})();
		return () => {
			cancel = true;
		};
	}, [authLoading, user, reload]);

	if (authLoading) {
		return (
			<div className="page">
				<p>Cargando…</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace state={{ from: '/proveedor/mis-resenas' }} />;
	}

	if (user.role !== 'proveedor') {
		return (
			<div className="page">
				<Link className="back-link" to="/">
					Volver
				</Link>
				<p className="error">Solo para cuentas de proveedor.</p>
			</div>
		);
	}

	const items = Array.isArray(data?.reviews) ? data.reviews : [];

	async function sendReply(r) {
		const id = String(r._id);
		const text = replyValue(r, replyDraft, id).trim();
		if (!text) {
			setActionMsg('Escribe una respuesta.');
			return;
		}
		setSubmittingId(id);
		setActionMsg('');
		try {
			await upsertProviderReply(id, { text });
			setActionMsg('Respuesta guardada.');
			await reload();
		} catch (err) {
			setActionMsg(err.response?.data?.message || 'No se pudo publicar la respuesta.');
		} finally {
			setSubmittingId('');
		}
	}

	return (
		<div className="page bookings-page">
			<Link className="back-link" to="/proveedor">
				Volver al panel
			</Link>
			<h1>Reseñas recibidas</h1>
			<p className="muted">Responde a quienes evaluaron tu servicio. Las pendientes aparecen primero.</p>
			{actionMsg ? <p className="review-success">{actionMsg}</p> : null}
			{loading ? <p>Cargando…</p> : null}
			{error ? <p className="error">{error}</p> : null}
			{!loading && !error && items.length === 0 ? <p className="bookings-empty">Aún no tienes reseñas.</p> : null}
			{!loading && items.length > 0 ? (
				<ul className="review-list" style={{ listStyle: 'none', padding: 0 }}>
					{items.map((r) => {
						const id = String(r._id);
						const has = Boolean(r.providerReply && r.providerReply.text);
						return (
							<li key={id} className="review-item" style={{ marginBottom: '1.5rem' }}>
								<div className="review-meta">
									<Stars value={r.rating} />
									<span className="review-author">{ownerLine(r.ownerId)}</span>
									<span className="review-date">{formatDate(r.createdAt)}</span>
									<span
										className={
											r.estadoRespuesta === 'sin_responder' ? 'booking-status pending' : 'booking-status ok'
										}
									>
										{r.estadoRespuesta === 'sin_responder' ? 'Sin responder' : 'Respondida'}
									</span>
								</div>
								{r.comment ? <p className="review-comment">{r.comment}</p> : null}
								{has ? (
									<div className="provider-response-block">
										<p className="muted" style={{ fontSize: '0.85rem', margin: '0.5rem 0 0' }}>
											<strong>Respuesta publicada</strong> — {formatDate(r.providerReply.updatedAt || r.providerReply.createdAt)}
										</p>
										<p style={{ marginTop: '0.25rem' }}>{r.providerReply.text}</p>
									</div>
								) : null}
								<div>
									<label className="review-field">
										<span>{has ? 'Editar respuesta' : 'Responder'}</span>
										<textarea
											rows={3}
											placeholder="Escribe una respuesta profesional"
											value={replyValue(r, replyDraft, id)}
											onChange={(e) => setReplyDraft((d) => ({ ...d, [id]: e.target.value }))}
										/>
									</label>
									<button
										type="button"
										className="review-submit"
										disabled={submittingId === id}
										onClick={() => void sendReply(r)}
									>
										{submittingId === id ? 'Enviando…' : has ? 'Actualizar respuesta' : 'Publicar respuesta'}
									</button>
								</div>
							</li>
						);
					})}
				</ul>
			) : null}
		</div>
	);
}
