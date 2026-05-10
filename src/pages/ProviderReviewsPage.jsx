import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchProviderOwnReviews, upsertProviderReply } from '../services/reviews';
import { CheckCircle2, Flag, MessageCircle, Star } from 'lucide-react';
import { hasRole } from '../lib/userRoles';
import { ReviewReportModal } from '../components/ReviewReportModal';
import { cn } from '../lib/utils';

const REPLY_MAX = 500;

const PAGE =
	'mx-auto w-full max-w-[52rem] px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))]';

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
		<span className="text-amber-500 tracking-wide text-[0.95rem]" aria-hidden>
			{'★'.repeat(n)}
			{'☆'.repeat(5 - n)}
		</span>
	);
}

function ownerLine(owner) {
	if (!owner) return 'Dueño';
	const s = [owner.name, owner.lastName].filter(Boolean).join(' ').trim();
	return s || 'Dueño';
}

function replyDraftValue(r, draft, id) {
	if (draft[id] !== undefined) return draft[id];
	const t = r.providerReply?.text;
	return t != null ? String(t) : '';
}

function RatingDistribution({ summary }) {
	if (!summary?.distributionWithPercent) return null;
	const rows = [5, 4, 3, 2, 1];
	return (
		<div className="flex flex-col gap-2" role="group" aria-label="Distribución de estrellas">
			{rows.map((stars) => {
				const cell = summary.distributionWithPercent[stars];
				const pct = cell?.percent ?? 0;
				const count = cell?.count ?? 0;
				return (
					<div key={stars} className="flex items-center gap-2 text-sm">
						<span className="w-14 shrink-0 tabular-nums text-muted-foreground">{stars}★</span>
						<div className="flex-1 h-2 rounded-full bg-muted overflow-hidden min-w-[4rem]">
							<div
								className="h-full rounded-full bg-amber-500/90 transition-[width] duration-300"
								style={{ width: `${Math.min(100, pct)}%` }}
							/>
						</div>
						<span className="w-24 shrink-0 text-right tabular-nums text-muted-foreground text-xs">
							{count} ({pct}%)
						</span>
					</div>
				);
			})}
		</div>
	);
}

export function ProviderReviewsPage() {
	const { user, loading: authLoading } = useAuth();
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [successMsg, setSuccessMsg] = useState('');
	const [replyDraft, setReplyDraft] = useState({});
	const [submittingId, setSubmittingId] = useState('');
	const [replyOpenId, setReplyOpenId] = useState(null);
	const [reportReviewId, setReportReviewId] = useState(null);
	const [reportToast, setReportToast] = useState('');

	const [filterEstado, setFilterEstado] = useState('todos');
	const [filterRating, setFilterRating] = useState('');
	const [priorizarPendientes, setPriorizarPendientes] = useState(false);

	const reload = useCallback(async () => {
		const res = await fetchProviderOwnReviews(undefined, {
			prioridad: priorizarPendientes ? 'pendientes' : 'recientes',
			estado: filterEstado,
			rating: filterRating
		});
		setData(res);
	}, [filterEstado, filterRating, priorizarPendientes]);

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

	useEffect(() => {
		if (!successMsg) return;
		const t = setTimeout(() => setSuccessMsg(''), 6000);
		return () => clearTimeout(t);
	}, [successMsg]);

	useEffect(() => {
		if (!reportToast) return;
		const t = setTimeout(() => setReportToast(''), 6000);
		return () => clearTimeout(t);
	}, [reportToast]);

	if (authLoading) {
		return (
			<div className={PAGE}>
				<p className="text-muted-foreground">Cargando…</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace state={{ from: '/proveedor/mis-resenas' }} />;
	}

	if (!hasRole(user, 'proveedor')) {
		return (
			<div className={PAGE}>
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
	const summary = data?.ratingSummary;
	const totalAll = summary?.count ?? 0;
	const avg = summary?.average;

	async function sendReply(r) {
		const id = String(r._id);
		const text = replyDraftValue(r, replyDraft, id).trim();
		if (!text) {
			setSuccessMsg('');
			setError('Escribe una respuesta.');
			return;
		}
		if (text.length > REPLY_MAX) {
			setError(`Máximo ${REPLY_MAX} caracteres.`);
			return;
		}
		setSubmittingId(id);
		setError('');
		try {
			await upsertProviderReply(id, { text });
			setSuccessMsg('Tu respuesta se publicó y ya es visible en tu perfil público.');
			setReplyOpenId(null);
			setReplyDraft((d) => {
				const next = { ...d };
				delete next[id];
				return next;
			});
			await reload();
		} catch (err) {
			setError(err.response?.data?.message || 'No se pudo publicar la respuesta.');
		} finally {
			setSubmittingId('');
		}
	}

	const pendingInList = items.filter((x) => x.estadoRespuesta === 'sin_responder').length;

	return (
		<div className={PAGE}>
			<Link
				className="inline-flex items-center gap-0.5 min-h-11 mb-4 px-0.5 py-0.5 text-primary font-semibold rounded-sm hover:text-primary/80 hover:underline"
				to="/proveedor"
			>
				← Volver al panel
			</Link>

			<div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col min-w-0 mb-5">
				<div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-gradient-to-r from-muted/40 to-transparent dark:from-muted/20">
					<Star className="w-4 h-4 text-primary/70 shrink-0" aria-hidden />
					<span className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70">Mis reseñas</span>
				</div>

				<div className="px-5 py-5 flex flex-col gap-5">
					<header>
						<h1 className="text-[clamp(1.4rem,2.4vw,1.75rem)] font-bold tracking-tight text-foreground mb-1 m-0">
							Reseñas recibidas
						</h1>
						<p className="m-0 text-muted-foreground max-w-[52ch] text-sm">
							Gestiona tu reputación: responde con profesionalismo, filtra y reporta contenido inapropiado. Las
							respuestas que publicas aquí son las mismas que ven los dueños en tu perfil público.
						</p>
					</header>

					{!loading && summary && totalAll > 0 ? (
						<section
							className="rounded-xl border border-border bg-muted/25 dark:bg-muted/15 px-4 py-4 sm:px-5 sm:py-5"
							aria-labelledby="reviews-summary-heading"
						>
							<h2 id="reviews-summary-heading" className="text-sm font-bold text-foreground m-0 mb-4">
								Resumen
							</h2>
							<div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
								<div className="flex items-baseline gap-2 shrink-0">
									<span className="text-4xl font-black text-foreground tabular-nums leading-none">
										{avg != null ? avg.toFixed(1) : '—'}
									</span>
									<div className="flex flex-col">
										<span className="text-amber-500 text-lg leading-none" aria-hidden>
											★★★★★
										</span>
										<span className="text-xs text-muted-foreground mt-1">
											{totalAll} reseña{totalAll === 1 ? '' : 's'}
										</span>
									</div>
								</div>
								<RatingDistribution summary={summary} />
							</div>
						</section>
					) : null}

					<div className="flex flex-col lg:flex-row gap-3 flex-wrap">
						<label className="flex flex-col gap-1 text-sm min-w-[11rem] flex-1">
							<span className="text-[0.72rem] font-bold uppercase tracking-wider text-muted-foreground">Calificación</span>
							<select
								className="h-11 rounded-xl border border-input bg-background px-3 font-[inherit] text-sm"
								value={filterRating}
								onChange={(e) => setFilterRating(e.target.value)}
								aria-label="Filtrar por estrellas"
							>
								<option value="">Todas</option>
								<option value="5">5 estrellas</option>
								<option value="4">4 estrellas</option>
								<option value="3">3 estrellas</option>
								<option value="2">2 estrellas</option>
								<option value="1">1 estrella</option>
							</select>
						</label>
						<label className="flex flex-col gap-1 text-sm min-w-[11rem] flex-1">
							<span className="text-[0.72rem] font-bold uppercase tracking-wider text-muted-foreground">Estado</span>
							<select
								className="h-11 rounded-xl border border-input bg-background px-3 font-[inherit] text-sm"
								value={filterEstado}
								onChange={(e) => setFilterEstado(e.target.value)}
								aria-label="Filtrar por respuesta del proveedor"
							>
								<option value="todos">Todas</option>
								<option value="sin_respuesta">Sin responder</option>
								<option value="con_respuesta">Con respuesta</option>
							</select>
						</label>
						<label className="flex items-center gap-2.5 min-h-11 mt-0 lg:mt-6 cursor-pointer select-none">
							<input
								type="checkbox"
								className="size-4 rounded border-input accent-primary"
								checked={priorizarPendientes}
								onChange={(e) => setPriorizarPendientes(e.target.checked)}
							/>
							<span className="text-sm text-foreground">Priorizar sin responder arriba</span>
						</label>
					</div>

					{successMsg ? (
						<div
							className="flex items-start gap-2 rounded-xl border border-emerald-300/60 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100"
							role="status"
							aria-live="polite"
						>
							<CheckCircle2 className="size-5 shrink-0 mt-0.5" aria-hidden />
							<span>{successMsg}</span>
						</div>
					) : null}
					{reportToast ? (
						<div
							className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground"
							role="status"
							aria-live="polite"
						>
							{reportToast}
						</div>
					) : null}
					{error ? (
						<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive m-0">
							{error}
						</p>
					) : null}

					{loading ? (
						<div className="flex items-center gap-2 py-10 justify-center text-muted-foreground" role="status">
							<div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
							<span>Cargando reseñas…</span>
						</div>
					) : null}

					{!loading && !error && items.length === 0 ? (
						<div
							className="flex flex-col items-center justify-center gap-3 py-12 text-center rounded-xl border border-dashed border-border bg-muted/20"
							role="status"
						>
							<Star className="w-10 h-10 text-muted-foreground/40" aria-hidden />
							<div>
								<p className="text-base font-bold text-foreground mb-1 m-0">No hay reseñas en esta vista</p>
								<p className="text-sm text-muted-foreground max-w-[32ch] m-0">
									Prueba otros filtros o vuelve más tarde.
								</p>
							</div>
						</div>
					) : null}

					{!loading && items.length > 0 ? (
						<p className="text-xs text-muted-foreground m-0">
							Mostrando {items.length} reseña{items.length === 1 ? '' : 's'}
							{filterEstado !== 'todos' || filterRating ? ' (filtros activos)' : ''}.
							{priorizarPendientes && pendingInList > 0 ? (
								<span>
									{' '}
									· {pendingInList} sin responder en este listado
								</span>
							) : null}
						</p>
					) : null}

					{!loading && items.length > 0 ? (
						<ul className="m-0 p-0 list-none flex flex-col gap-4">
							{items.map((r) => {
								const id = String(r._id);
								const has = Boolean(r.providerReply && String(r.providerReply.text || '').trim());
								const unanswered = r.estadoRespuesta === 'sin_responder';
								const formOpen = replyOpenId === id;

								return (
									<li
										key={id}
										className={cn(
											'rounded-xl border bg-background dark:bg-card shadow-sm p-4 sm:p-5 flex flex-col gap-3.5 transition-colors',
											unanswered
												? 'border-amber-400/80 ring-2 ring-amber-400/25 dark:border-amber-700/80 dark:ring-amber-500/20'
												: 'border-border'
										)}
									>
										<div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-border">
											<div className="flex-1 min-w-0">
												<div className="flex flex-wrap items-center gap-2 mb-0.5">
													<span className="font-semibold text-foreground">{ownerLine(r.ownerId)}</span>
													<span
														className={
															unanswered
																? 'inline-flex items-center rounded-full px-2 py-0.5 text-[0.75rem] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
																: 'inline-flex items-center rounded-full px-2 py-0.5 text-[0.75rem] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
														}
													>
														{unanswered ? 'Sin responder' : 'Respondida'}
													</span>
												</div>
												<div className="flex items-center gap-2 flex-wrap">
													<div aria-label={`${r.rating} de 5 estrellas`}>
														<Stars value={r.rating} />
													</div>
													<time className="text-[0.82rem] text-muted-foreground" dateTime={r.createdAt || undefined}>
														{formatDate(r.createdAt)}
													</time>
												</div>
											</div>
											<button
												type="button"
												className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border bg-background text-sm font-semibold text-foreground hover:bg-muted/60 transition-colors cursor-pointer shrink-0"
												onClick={() => setReportReviewId(id)}
											>
												<Flag className="size-3.5 text-muted-foreground" aria-hidden />
												Reportar reseña
											</button>
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

										<div className="flex flex-col gap-2.5 pt-1">
											{unanswered && !formOpen ? (
												<button
													type="button"
													className="self-start inline-flex h-10 items-center gap-2 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors border-0 cursor-pointer"
													onClick={() => {
														setReplyOpenId(id);
														setReplyDraft((d) => ({ ...d, [id]: replyDraftValue(r, d, id) }));
													}}
												>
													<MessageCircle className="size-4 shrink-0" aria-hidden />
													Responder
												</button>
											) : null}
											{has && !formOpen ? (
												<button
													type="button"
													className="self-start text-sm font-bold text-primary hover:underline cursor-pointer bg-transparent border-0 p-0 min-h-10"
													onClick={() => {
														setReplyOpenId(id);
														setReplyDraft((d) => ({ ...d, [id]: replyDraftValue(r, d, id) }));
													}}
												>
													Editar respuesta
												</button>
											) : null}
											{formOpen ? (
												<div className="flex flex-col gap-2 pt-2 border-t border-border/60">
													<label className="flex flex-col gap-1.5 text-sm">
														<span className="text-[0.75rem] font-bold tracking-widest uppercase text-muted-foreground">
															{has ? 'Editar respuesta' : 'Tu respuesta'}
														</span>
														<textarea
															className="w-full max-w-full min-h-[6rem] resize-y rounded-xl border border-input bg-background px-3 py-2.5 font-[inherit] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
															rows={4}
															maxLength={REPLY_MAX}
															placeholder="Respuesta profesional (máx. 500 caracteres)…"
															value={replyDraftValue(r, replyDraft, id)}
															onChange={(e) =>
																setReplyDraft((d) => ({ ...d, [id]: e.target.value.slice(0, REPLY_MAX) }))
															}
															aria-describedby={`reply-count-${id}`}
														/>
														<span id={`reply-count-${id}`} className="text-xs text-muted-foreground text-right tabular-nums">
															{replyDraftValue(r, replyDraft, id).length}/{REPLY_MAX}
														</span>
													</label>
													<div className="flex flex-wrap gap-2">
														<button
															type="button"
															className="inline-flex h-9 items-center px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-65 disabled:cursor-not-allowed border-0 cursor-pointer"
															disabled={submittingId === id}
															onClick={() => void sendReply(r)}
														>
															{submittingId === id ? 'Publicando…' : has ? 'Guardar cambios' : 'Publicar respuesta'}
														</button>
														<button
															type="button"
															className="inline-flex h-9 items-center px-4 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-muted/50 cursor-pointer"
															disabled={submittingId === id}
															onClick={() => {
																setReplyOpenId(null);
																setReplyDraft((d) => {
																	const next = { ...d };
																	delete next[id];
																	return next;
																});
															}}
														>
															Cancelar
														</button>
													</div>
												</div>
											) : null}
										</div>
									</li>
								);
							})}
						</ul>
					) : null}
				</div>
			</div>

			<ReviewReportModal
				open={Boolean(reportReviewId)}
				reviewId={reportReviewId}
				onClose={() => setReportReviewId(null)}
				onDone={(msg) => setReportToast(msg)}
			/>
		</div>
	);
}
