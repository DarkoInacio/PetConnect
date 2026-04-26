import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchProviderOwnReviews, upsertProviderReply } from '../services/reviews';
import { Star } from 'lucide-react';
import { hasRole } from '../lib/userRoles';

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
	return (
		<span className="text-amber-500 tracking-wide text-[0.95rem]">
			{'★'.repeat(n)}{'☆'.repeat(5 - n)}
		</span>
	);
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
		if (authLoading || !user || !hasRole(user, 'proveedor')) return;
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
			<div className="mx-auto w-full max-w-[48rem] px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
				<p>Cargando…</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace state={{ from: '/proveedor/mis-resenas' }} />;
	}

	if (!hasRole(user, 'proveedor')) {
		return (
			<div className="mx-auto w-full max-w-[48rem] px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
				<Link
					className="inline-flex items-center gap-0.5 min-h-11 mb-2 px-0.5 py-0.5 text-primary font-semibold rounded-sm hover:text-primary/80 hover:underline"
					to="/"
				>
					Volver
				</Link>
				<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive mb-3">
					Solo para cuentas de proveedor.
				</p>
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

	const answeredCount = items.filter((r) => r.estadoRespuesta !== 'sin_responder').length;
	const pendingCount = items.filter((r) => r.estadoRespuesta === 'sin_responder').length;

	return (
		<div className="mx-auto w-full max-w-[48rem] px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
			<Link
				className="inline-flex items-center gap-0.5 min-h-11 mb-3 px-0.5 py-0.5 text-primary font-semibold rounded-sm hover:text-primary/80 hover:underline"
				to="/proveedor"
			>
				← Volver al panel
			</Link>

			<div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col min-w-0">
				<div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-gradient-to-r from-muted/40 to-transparent dark:from-muted/20">
					<Star className="w-4 h-4 text-primary/70 shrink-0" />
					<span className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70">Valoraciones</span>
				</div>

				<div className="px-5 py-5 flex flex-col gap-4">
					<header className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<h1 className="text-[clamp(1.4rem,2.4vw,1.75rem)] font-bold tracking-tight text-foreground mb-1">
								Reseñas recibidas
							</h1>
							<p className="m-0 text-muted-foreground max-w-[48ch]">
								Responde a quienes evaluaron tu servicio.{' '}
								<strong className="text-primary font-bold">Las pendientes</strong> aparecen primero.
							</p>
						</div>
						{!loading && items.length > 0 ? (
							<div className="flex gap-2 shrink-0 flex-wrap">
								{pendingCount > 0 ? (
									<span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
										{pendingCount} sin responder
									</span>
								) : null}
								{answeredCount > 0 ? (
									<span className="inline-flex items-center rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
										{answeredCount} respondida{answeredCount !== 1 ? 's' : ''}
									</span>
								) : null}
							</div>
						) : null}
					</header>

					{actionMsg ? (
						<p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{actionMsg}</p>
					) : null}
					{loading ? (
						<div className="flex items-center gap-2 py-8 justify-center text-muted-foreground" role="status" aria-live="polite">
							<div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
							<span>Cargando reseñas…</span>
						</div>
					) : null}
					{error ? (
						<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
							{error}
						</p>
					) : null}
					{!loading && !error && items.length === 0 ? (
						<div
							className="flex flex-col items-center justify-center gap-3 py-12 text-center rounded-xl border border-dashed border-border bg-muted/20"
							role="status"
						>
							<Star className="w-10 h-10 text-muted-foreground/40" />
							<div>
								<p className="text-base font-bold text-foreground mb-1">Aún no tienes reseñas</p>
								<p className="text-sm text-muted-foreground max-w-[30ch]">
									Cuando un dueño deje su opinión, aparecerá aquí y podrás contestarle.
								</p>
							</div>
						</div>
					) : null}
					{!loading && items.length > 0 ? (
						<ul className="mt-0.5 mb-0 p-0 list-none flex flex-col gap-4">
							{items.map((r) => {
								const id = String(r._id);
								const has = Boolean(r.providerReply && r.providerReply.text);
								return (
									<li key={id} className="rounded-xl border border-border bg-background dark:bg-card shadow-sm p-4 sm:p-5 flex flex-col gap-3.5">
										<div className="flex flex-wrap items-start gap-2 pb-3 border-b border-border">
											<div className="flex-1 min-w-0">
												<div className="flex flex-wrap items-center gap-2 mb-0.5">
													<span className="font-semibold text-foreground">{ownerLine(r.ownerId)}</span>
													<span
														className={
															r.estadoRespuesta === 'sin_responder'
																? 'inline-flex items-center rounded-full px-2 py-0.5 text-[0.75rem] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
																: 'inline-flex items-center rounded-full px-2 py-0.5 text-[0.75rem] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
														}
													>
														{r.estadoRespuesta === 'sin_responder' ? 'Sin responder' : 'Respondida'}
													</span>
												</div>
												<div className="flex items-center gap-2">
													<div aria-label={`${r.rating} de 5 estrellas`}>
														<Stars value={r.rating} />
													</div>
													<time className="text-[0.82rem] text-muted-foreground" dateTime={r.createdAt || undefined}>
														{formatDate(r.createdAt)}
													</time>
												</div>
											</div>
										</div>
										{r.comment ? (
											<blockquote className="m-0 rounded-lg border border-border/60 bg-muted/30 px-3.5 py-2.5">
												<p className="m-0 leading-relaxed text-foreground/90 text-[0.93rem]">{r.comment}</p>
											</blockquote>
										) : null}
										{has ? (
											<div className="rounded-lg border border-teal-200 bg-teal-50 px-3.5 py-2.5 dark:bg-teal-950/30 dark:border-teal-800">
												<div className="flex items-center justify-between gap-2 mb-1.5">
													<p className="m-0 text-[0.78rem] font-bold tracking-wide uppercase text-teal-700 dark:text-teal-300">
														Tu respuesta
													</p>
													<time className="text-[0.82rem] text-muted-foreground">
														{formatDate(r.providerReply.updatedAt || r.providerReply.createdAt)}
													</time>
												</div>
												<p className="m-0 leading-relaxed text-foreground/90 text-[0.93rem]">
													{r.providerReply.text}
												</p>
											</div>
										) : null}
										<div className="flex flex-col gap-2.5 pt-3 border-t border-border/60">
											<label className="flex flex-col gap-1.5 text-sm">
												<span className="text-[0.75rem] font-bold tracking-widest uppercase text-muted-foreground">
													{has ? 'Editar respuesta' : 'Escribir respuesta'}
												</span>
												<textarea
													className="w-full max-w-full min-h-[5rem] resize-y rounded-xl border border-input bg-background px-3 py-2.5 font-[inherit] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
													rows={3}
													placeholder="Escribe una respuesta profesional…"
													value={replyValue(r, replyDraft, id)}
													onChange={(e) => setReplyDraft((d) => ({ ...d, [id]: e.target.value }))}
												/>
											</label>
											<button
												type="button"
												className="self-start inline-flex h-9 items-center px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-65 disabled:cursor-not-allowed border-0 cursor-pointer"
												disabled={submittingId === id}
												onClick={() => void sendReply(r)}
											>
												{submittingId === id
													? 'Enviando…'
													: has
														? 'Actualizar respuesta'
														: 'Publicar respuesta'}
											</button>
										</div>
									</li>
								);
							})}
						</ul>
					) : null}
				</div>
			</div>
		</div>
	);
}
