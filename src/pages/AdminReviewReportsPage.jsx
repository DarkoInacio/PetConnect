import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { decideReviewReport, fetchReviewReports } from '../services/admin';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Flag, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const REASON_LABELS = {
	contenido_falso: 'Contenido falso',
	lenguaje_ofensivo: 'Lenguaje ofensivo',
	spam: 'Spam',
	informacion_personal: 'Información personal',
	otro: 'Otro',
};

const STATUS_FILTER_OPTIONS = [
	{ value: 'pendiente', label: 'Pendiente' },
	{ value: 'revisada_resena_mantenida', label: 'Cerrado — reseña mantenida' },
	{ value: 'revisada_resena_eliminada', label: 'Cerrado — reseña retirada' },
	{ value: 'revisada_autor_suspendido', label: 'Cerrado — autor sancionado' },
];

const TH_CLS =
	'px-4 py-3 text-left text-[0.72rem] font-bold uppercase tracking-wide text-muted-foreground border-b border-border bg-muted/40 dark:bg-muted/20 whitespace-nowrap';
const TD_CLS = 'px-4 py-3 text-left text-sm border-b border-border/60 align-top';

function formatDate(iso) {
	if (!iso) return '—';
	try {
		return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
	} catch {
		return '—';
	}
}

export function AdminReviewReportsPage() {
	const { user, loading: authLoading } = useAuth();
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [actionMsg, setActionMsg] = useState('');
	const [estado, setEstado] = useState('pendiente');
	const [nota, setNota] = useState('');
	const [busyId, setBusyId] = useState('');

	const reload = useCallback(async () => {
		const res = await fetchReviewReports({ estado });
		setData(res);
	}, [estado]);

	useEffect(() => {
		if (authLoading || !user || user.role !== 'admin') return;
		let cancel = false;
		(async () => {
			try {
				setLoading(true);
				setError('');
				await reload();
			} catch (err) {
				if (!cancel) setError(err.response?.data?.message || 'Error al cargar reportes.');
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
			<div className="mx-auto w-full max-w-[1200px] px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
				<p className="text-muted-foreground animate-pulse">Cargando…</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace state={{ from: '/admin/resenas-reportes' }} />;
	}

	if (user.role !== 'admin') {
		return (
			<div className="mx-auto w-full max-w-[1200px] px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
				<Link
					className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline min-h-11 mb-4"
					to="/"
				>
					← Volver
				</Link>
				<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
					Solo administradores.
				</p>
			</div>
		);
	}

	const list = Array.isArray(data?.reports) ? data.reports : [];

	async function runAction(reportId, accion) {
		setBusyId(String(reportId));
		setActionMsg('');
		try {
			const r = await decideReviewReport(String(reportId), { accion, nota: nota.trim() || undefined });
			setActionMsg(r.message || 'Listo.');
			setNota('');
			await reload();
		} catch (err) {
			setActionMsg(err.response?.data?.message || 'Error al resolver.');
		} finally {
			setBusyId('');
		}
	}

	return (
		<div className="mx-auto w-full max-w-[1200px] px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
			<Link
				className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline min-h-11 mb-4"
				to="/admin/proveedores"
			>
				← Admin proveedores
			</Link>

			{/* Page header */}
			<header className="mb-7">
				<p className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70 mb-1">
					Administración
				</p>
				<h1 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold tracking-tight text-foreground flex items-center gap-2">
					<Flag size={22} className="text-primary" aria-hidden />
					Reportes de reseñas
				</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Cola de moderación. Resolución según política del equipo.
				</p>
			</header>

			{/* Filters + nota */}
			<div className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6 mb-5 flex flex-col gap-4">
				<div className="flex flex-col sm:flex-row sm:items-end gap-4">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="estado-filter" className="text-sm font-semibold text-foreground">
							Filtrar por estado
						</Label>
						<select
							id="estado-filter"
							value={estado}
							onChange={(e) => setEstado(e.target.value)}
							className="h-11 rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors min-w-[16rem]"
						>
							{STATUS_FILTER_OPTIONS.map((o) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
					</div>
				</div>
				<div className="flex flex-col gap-1.5 max-w-lg">
					<Label htmlFor="nota-interna" className="text-sm font-semibold text-foreground">
						Nota interna{' '}
						<span className="text-muted-foreground font-normal">(opcional, se aplica a la próxima acción)</span>
					</Label>
					<Textarea
						id="nota-interna"
						value={nota}
						onChange={(e) => setNota(e.target.value)}
						rows={2}
						maxLength={2000}
						placeholder="Describe el motivo de la decisión…"
						className="resize-none"
					/>
				</div>
			</div>

			{/* Feedback messages */}
			{actionMsg ? (
				<div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 px-3.5 py-3 text-sm text-emerald-700 dark:text-emerald-400 font-medium mb-4">
					{actionMsg}
				</div>
			) : null}
			{error ? (
				<p
					className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive mb-4"
					role="alert"
				>
					{error}
				</p>
			) : null}
			{loading ? (
				<p className="text-muted-foreground mb-4" role="status" aria-live="polite">
					Cargando reportes…
				</p>
			) : null}

			{/* Empty state */}
			{!loading && !error && list.length === 0 ? (
				<div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 dark:bg-muted/5 p-12 text-center">
					<div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
						<CheckCircle size={22} className="text-emerald-600 dark:text-emerald-400" aria-hidden />
					</div>
					<p className="font-semibold text-foreground">Sin reportes</p>
					<p className="text-sm text-muted-foreground">No hay reportes en este filtro.</p>
				</div>
			) : null}

			{/* Reports table */}
			{!loading && list.length > 0 ? (
				<div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
					<table className="w-full border-collapse text-sm">
						<thead>
							<tr>
								<th scope="col" className={TH_CLS}>Fecha</th>
								<th scope="col" className={TH_CLS}>Motivo</th>
								<th scope="col" className={TH_CLS}>Reportante</th>
								<th scope="col" className={TH_CLS}>Reseña</th>
								<th scope="col" className={TH_CLS}>Acciones</th>
							</tr>
						</thead>
						<tbody>
							{list.map((rep) => {
								const id = String(rep._id);
								const rev = rep.reviewId;
								const repUser = rep.reporterId;
								return (
									<tr key={id} className="hover:bg-muted/20 transition-colors">
										<td className={`${TD_CLS} text-muted-foreground whitespace-nowrap`}>
											{formatDate(rep.createdAt)}
										</td>
										<td className={TD_CLS}>
											<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
												<AlertTriangle size={10} className="mr-1" aria-hidden />
												{REASON_LABELS[rep.reason] || rep.reason}
											</span>
											{rep.reason === 'otro' && rep.otherText ? (
												<p className="text-xs text-muted-foreground mt-1">{rep.otherText}</p>
											) : null}
										</td>
										<td className={`${TD_CLS} text-muted-foreground`}>
											{repUser
												? [repUser.name, repUser.lastName].filter(Boolean).join(' ') || repUser.email
												: '—'}
										</td>
										<td className={`${TD_CLS} text-muted-foreground max-w-[280px]`}>
											{rev ? (
												<>
													{rev.rating != null ? (
														<span className="text-amber-500 font-semibold mr-1">
															{'★'.repeat(rev.rating)}
														</span>
													) : null}
													{rev.comment ? String(rev.comment).slice(0, 120) : '—'}
													{rev.comment && String(rev.comment).length > 120 ? '…' : ''}
												</>
											) : (
												'—'
											)}
										</td>
										<td className={TD_CLS}>
											{rep.status === 'pendiente' ? (
												<div className="flex flex-wrap gap-1.5">
													<button
														type="button"
														className="inline-flex h-7 items-center gap-1 px-2.5 rounded-lg border border-border bg-background text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
														disabled={busyId === id}
														onClick={() => void runAction(rep._id, 'aprobar_reseña')}
													>
														<CheckCircle size={11} aria-hidden /> Mantener
													</button>
													<button
														type="button"
														className="inline-flex h-7 items-center gap-1 px-2.5 rounded-lg border border-red-200 bg-white dark:bg-card text-red-800 dark:text-red-300 dark:border-red-900 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer disabled:opacity-50"
														disabled={busyId === id}
														onClick={() => void runAction(rep._id, 'eliminar_reseña')}
													>
														<XCircle size={11} aria-hidden /> Retirar
													</button>
													<button
														type="button"
														className="inline-flex h-7 items-center gap-1 px-2.5 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors cursor-pointer disabled:opacity-50"
														disabled={busyId === id}
														onClick={() => void runAction(rep._id, 'suspender_autor')}
													>
														Suspender autor
													</button>
												</div>
											) : (
												<span className="text-xs text-muted-foreground">{rep.status}</span>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			) : null}
		</div>
	);
}
