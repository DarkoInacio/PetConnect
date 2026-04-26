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
	const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold';
	if (s.includes('cancel')) return `${base} bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300`;
	if (s === 'completed') return `${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300`;
	if (s === 'pending_confirmation' || s === 'pendiente') return `${base} bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300`;
	return `${base} bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300`;
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

const TH_CLS = 'px-4 py-3 text-left text-[0.72rem] font-bold uppercase tracking-wide text-muted-foreground border-b border-border bg-muted/40 dark:bg-muted/20 whitespace-nowrap';
const TD_CLS = 'px-4 py-3 text-left text-sm border-b border-border/60 align-top';

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
					<button
						type="button"
						className="inline-flex items-center px-2.5 py-1 text-[0.82rem] rounded-lg bg-background text-red-700 border border-red-200 font-bold cursor-pointer hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/20 transition-colors"
						onClick={() => onCancelAppointment(row)}
					>
						Cancelar reserva
					</button>
				) : null}
				{showReview ? (
					<button
						type="button"
						className="inline-flex items-center px-2.5 py-1 text-[0.82rem] rounded-lg bg-muted text-foreground border border-border font-bold cursor-pointer hover:bg-accent transition-colors"
						onClick={() => {
							setOwnerReviewRow(row);
						}}
					>
						Reseña
					</button>
				) : null}
				{!hasAny ? <span className="text-muted-foreground">—</span> : null}
			</>
		);
	}

	if (authLoading) {
		return (
			<div className="w-full">
				<div className="rounded-2xl border border-border bg-card shadow-sm p-6" role="status" aria-live="polite">
					<p className="text-muted-foreground m-0 animate-pulse">Cargando…</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return <Navigate to='/login' replace state={{ from: '/cuenta/reservas' }} />;
	}

	if (user.role !== 'dueno') {
		return (
			<div className="w-full">
				<div className="rounded-2xl border border-border bg-card shadow-sm p-6">
					<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive m-0" role="alert">
						Mis reservas solo está disponible para cuentas de dueño.
					</p>
				</div>
			</div>
		);
	}

	const items = Array.isArray(data?.items) ? data.items : [];

	return (
		<div className="w-full flex flex-col gap-4">
			<div className="rounded-2xl border border-border bg-card shadow-sm">
				<div className="px-5 py-4 border-b border-border bg-gradient-to-r from-muted/40 to-transparent dark:from-muted/20">
					<p className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70 mb-0.5">Historial</p>
					<h1 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold tracking-tight text-foreground">Reservas</h1>
				</div>
				<div className="px-5 py-4">
					<p className="text-muted-foreground text-[0.95rem] max-w-[52ch] m-0">
						Agenda, solicitudes a paseadores o cuidadores e historial. Puedes reseñar servicios{' '}
						<strong>completados</strong> con puntuación y observación (máx. 200 caracteres).
					</p>
				</div>
			</div>

			{actionMsg ? (
				<p className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-3 text-sm text-emerald-700 dark:text-emerald-400 m-0">
					{actionMsg}
				</p>
			) : null}

			{loading ? (
				<div className="rounded-2xl border border-border bg-card shadow-sm p-8 flex items-center justify-center" role="status" aria-live="polite">
					<p className="text-muted-foreground m-0 animate-pulse">Cargando reservas…</p>
				</div>
			) : null}

			{error ? (
				<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive m-0" role="alert" aria-live="assertive">
					{error}
				</p>
			) : null}

			{!loading && !error && items.length === 0 ? (
				<div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 dark:bg-muted/5 p-12 text-center" role="status">
					<Calendar
						className="text-primary opacity-80"
						aria-hidden
						strokeWidth={1.5}
						size={40}
					/>
					<div>
						<p className="text-[1.05rem] font-semibold text-foreground mb-1">Aún no tienes reservas</p>
						<p className="text-muted-foreground text-[0.95rem] m-0">
							Explora el mapa, elige un proveedor y agenda tu primera cita o servicio.
						</p>
					</div>
				</div>
			) : null}

			{!loading && items.length > 0 ? (
				<div className="flex flex-col gap-3 min-[900px]:hidden" aria-label="Vista móvil de reservas">
					{items.map((row) => {
						const m = getBookingRowMeta(row);
						const aid = appointmentId(row);
						return (
							<article
								key={`card-${row.kind}-${aid || row.id || row._id || 'row'}`}
								className="rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm"
							>
								<p className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Fecha y hora</p>
								<p className="mb-2.5 text-[0.95rem] text-foreground last:mb-0">{formatRange(row.startAt, row.endAt)}</p>
								<p className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Proveedor</p>
								<div className="mb-2.5 text-[0.95rem] text-foreground last:mb-0">
									{m.href ? <Link to={m.href}>{providerLabel(m.prov)}</Link> : providerLabel(m.prov)}
								</div>
								<p className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Origen</p>
								<p className="mb-2.5 text-[0.95rem] text-foreground last:mb-0">{m.originLabel}</p>
								<p className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Detalle</p>
								<p className="mb-2.5 text-[0.95rem] text-foreground last:mb-0">{m.detail}</p>
								<p className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Estado</p>
								<p className="mb-2.5 text-[0.95rem] text-foreground last:mb-0">
									<span className={statusBadgeClass(row.status)}>{m.statusLabel}</span>
								</p>
								<div className="mt-3 pt-2.5 border-t border-border flex flex-wrap gap-1.5">
									{renderOwnerBookingActions(row)}
								</div>
							</article>
						);
					})}
				</div>
			) : null}

			{!loading && items.length > 0 ? (
				<div
					className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm hidden min-[900px]:block"
					role="region"
					aria-label="Tabla de reservas"
				>
					<table className="w-full border-collapse text-[0.92rem]">
						<thead>
							<tr>
								<th scope="col" className={TH_CLS}>Fecha</th>
								<th scope="col" className={TH_CLS}>Origen</th>
								<th scope="col" className={TH_CLS}>Proveedor</th>
								<th scope="col" className={TH_CLS}>Detalle</th>
								<th scope="col" className={TH_CLS}>Estado</th>
								<th scope="col" className={TH_CLS}>Acciones</th>
							</tr>
						</thead>
						<tbody>
							{items.map((row) => {
								const m = getBookingRowMeta(row);
								const aid = appointmentId(row);
								return (
									<tr key={`${row.kind}-${aid || row.id || row._id || 'row'}`}>
										<td className={TD_CLS}>{formatRange(row.startAt, row.endAt)}</td>
										<td className={TD_CLS}>{m.originLabel}</td>
										<td className={TD_CLS}>{m.href ? <Link to={m.href}>{providerLabel(m.prov)}</Link> : providerLabel(m.prov)}</td>
										<td className={`${TD_CLS} max-w-[280px] text-muted-foreground`}>{m.detail}</td>
										<td className={TD_CLS}>
											<span className={statusBadgeClass(row.status)}>{m.statusLabel}</span>
										</td>
										<td className={`${TD_CLS} flex flex-wrap gap-1.5`}>{renderOwnerBookingActions(row)}</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			) : null}

			{import.meta.env.DEV && data?.note ? (
				<p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[0.8rem] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 m-0">
					<strong>Nota (solo desarrollo):</strong> {data.note}
				</p>
			) : null}

			{ownerReviewRow ? (
				<div
					className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
					role="presentation"
					onClick={() => {
						if (!ownerReviewSubmit) closeOwnerReview();
					}}
				>
					<div
						className="rounded-2xl border border-border bg-card shadow-xl px-6 py-6 max-w-md w-full max-h-[90vh] overflow-auto"
						role="dialog"
						aria-modal="true"
						aria-labelledby="owner-review-title"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="mb-4">
							<p className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70 mb-0.5">Reseña</p>
							<h3 id="owner-review-title" className="text-lg font-bold text-foreground m-0">Reseña del servicio</h3>
							<p className="text-muted-foreground text-sm mt-1 m-0">
								{formatRange(ownerReviewRow.startAt, ownerReviewRow.endAt)} — {providerLabel(ownerReviewRow.provider)}
							</p>
						</div>

						{eligLoading ? (
							<p className="text-muted-foreground text-sm animate-pulse">Cargando…</p>
						) : null}
						{eligError ? (
							<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive mb-3 m-0">
								{eligError}
							</p>
						) : null}
						{!eligLoading && elig && !elig.canReview && !elig.hasReview ? (
							<p className="text-muted-foreground text-sm">
								Esta cita aún no califica para reseña (estado: {elig.appointmentStatus || '—'}). Tras
								finalizar, podrás dejar tu opinión.
							</p>
						) : null}
						{!eligLoading && elig && (elig.canReview || elig.hasReview) ? (
							elig.hasReview && elig.canEdit === false ? (
								<div className="flex flex-col gap-3">
									<div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex flex-col gap-2">
										<div className="flex items-center gap-2">
											<span className="text-sm font-semibold text-foreground">Calificación:</span>
											<span className="text-sm text-foreground">{ownerForm.rating} / 5</span>
										</div>
										{ownerForm.comment ? (
											<div>
												<span className="text-sm font-semibold text-foreground">Observación:</span>
												<p className="text-sm text-muted-foreground mt-0.5 m-0">{ownerForm.comment}</p>
											</div>
										) : null}
									</div>
									<p className="text-muted-foreground text-[0.85rem] m-0">
										La edición solo estuvo disponible durante 24 h tras publicar.
									</p>
									<div className="flex gap-2 justify-end mt-1">
										<button
											type="button"
											className="inline-flex h-10 items-center justify-center px-4 rounded-xl bg-muted text-foreground border border-border font-semibold text-sm cursor-pointer hover:bg-accent transition-colors"
											onClick={closeOwnerReview}
										>
											Cerrar
										</button>
									</div>
								</div>
							) : (
								<form
									className="flex flex-col gap-3"
									onSubmit={(e) => {
										e.preventDefault();
										void submitOwnerReview();
									}}
								>
									<div className="flex flex-col gap-1.5">
										<label htmlFor="rev-rating" className="text-sm font-semibold text-foreground">Calificación (estrellas)</label>
										<select
											id="rev-rating"
											className="h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
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
									</div>
									<div className="flex flex-col gap-1.5">
										<label htmlFor="rev-comment" className="text-sm font-semibold text-foreground">Observación (opcional, máx. 200 caracteres)</label>
										<textarea
											id="rev-comment"
											className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors resize-none"
											value={ownerForm.comment}
											onChange={(e) => setOwnerForm((f) => ({ ...f, comment: e.target.value }))}
											rows={3}
											maxLength={200}
										/>
									</div>
									{elig.hasReview ? (
										<p className="text-muted-foreground text-[0.85rem] m-0">
											Solo puedes editar en las 24 h posteriores a publicar (lo valida el servidor).
										</p>
									) : null}
									{ownerReviewMsg ? (
										<p className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-3 text-sm text-emerald-700 dark:text-emerald-400 m-0">
											{ownerReviewMsg}
										</p>
									) : null}
									<div className="flex gap-2 justify-end mt-1">
										<button
											type="button"
											className="inline-flex h-10 items-center justify-center px-4 rounded-xl bg-muted text-foreground border border-border font-semibold text-sm cursor-pointer hover:bg-accent transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
											onClick={closeOwnerReview}
											disabled={ownerReviewSubmit}
										>
											Cerrar
										</button>
										<button
											type="submit"
											className="inline-flex h-10 items-center justify-center px-5 rounded-xl bg-primary text-primary-foreground font-bold text-sm cursor-pointer hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
											disabled={ownerReviewSubmit}
										>
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
