import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
	approveProvider,
	fetchActiveProviders,
	fetchAuditLogs,
	fetchPendingProviders,
	fetchSuspendedProviders,
	reactivateProvider,
	rejectProvider,
	suspendProvider
} from '../services/admin';
import { runReminders24h } from '../services/adminJobs';
import { resolveBackendAssetUrl } from '../services/api';
import { Button } from '@/components/ui/button';
import {
	ShieldCheck,
	Users,
	Play,
	Check,
	X,
	UserCheck,
	Ban,
	RotateCcw,
	FileText,
	ScrollText,
	Calendar
} from 'lucide-react';

const TH_CLS =
	'px-4 py-3 text-left text-[0.72rem] font-bold uppercase tracking-wide text-muted-foreground border-b border-border bg-muted/40 dark:bg-muted/20 whitespace-nowrap';
const TD_CLS = 'px-4 py-3 text-left text-sm border-b border-border/60 align-top';

function formatDt(iso) {
	if (!iso) return '—';
	try {
		return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
	} catch {
		return '—';
	}
}

function isAdminUser(user) {
	return user?.role === 'admin';
}

export function AdminProvidersPage() {
	const { user, loading: authLoading } = useAuth();
	const [pendingData, setPendingData] = useState(null);
	const [activeData, setActiveData] = useState(null);
	const [suspendedData, setSuspendedData] = useState(null);
	const [auditData, setAuditData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [actionMsg, setActionMsg] = useState('');
	const [jobLoading, setJobLoading] = useState(false);

	const reloadAll = useCallback(async () => {
		const [p, a, s, logs] = await Promise.all([
			fetchPendingProviders({ page: 1, limit: 50 }),
			fetchActiveProviders({ page: 1, limit: 50 }),
			fetchSuspendedProviders({ page: 1, limit: 50 }),
			fetchAuditLogs({ page: 1, limit: 40 })
		]);
		setPendingData(p);
		setActiveData(a);
		setSuspendedData(s);
		setAuditData(logs);
	}, []);

	useEffect(() => {
		if (authLoading || !user || !isAdminUser(user)) return;
		let cancelled = false;
		(async () => {
			try {
				setLoading(true);
				setError('');
				await reloadAll();
			} catch (err) {
				if (!cancelled) setError(err.response?.data?.message || 'Error al cargar datos de administración.');
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [authLoading, user, reloadAll]);

	if (authLoading) {
		return (
			<div className="mx-auto w-full max-w-[1200px] px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
				<p className="text-muted-foreground animate-pulse">Cargando…</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to='/login' replace state={{ from: '/admin/proveedores' }} />;
	}

	if (!isAdminUser(user)) {
		return (
			<div className="mx-auto w-full max-w-[1200px] px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
				<Link
					className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline min-h-11 mb-4"
					to='/'
				>
					← Inicio
				</Link>
				<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
					El panel de administración requiere iniciar sesión con una cuenta de rol administrador (token JWT).
				</p>
			</div>
		);
	}

	const pendingItems = pendingData?.items || [];
	const pendingTotal = pendingData?.pendingCount ?? pendingData?.total ?? pendingItems.length;
	const activeItems = activeData?.items || [];
	const suspendedItems = suspendedData?.items || [];
	const auditItems = auditData?.items || [];

	async function flash(msg) {
		setActionMsg(msg);
		await reloadAll();
	}

	async function onApprove(id) {
		setActionMsg('');
		try {
			await approveProvider(id);
			await flash('Proveedor aprobado. Se envió correo de activación.');
		} catch (err) {
			setActionMsg(err.response?.data?.message || 'No se pudo aprobar.');
		}
	}

	async function onReject(id) {
		const reason = window.prompt('Motivo del rechazo (obligatorio):');
		if (!reason || !reason.trim()) return;
		setActionMsg('');
		try {
			await rejectProvider(id, reason.trim());
			await flash('Proveedor rechazado. Se notificó por correo.');
		} catch (err) {
			setActionMsg(err.response?.data?.message || 'No se pudo rechazar.');
		}
	}

	async function onSuspend(id) {
		const note = window.prompt('Motivo de la desactivación temporal (opcional):') || '';
		setActionMsg('');
		try {
			await suspendProvider(id, note.trim());
			await flash('Perfil desactivado: ya no aparece en mapa ni buscador.');
		} catch (err) {
			setActionMsg(err.response?.data?.message || 'No se pudo desactivar.');
		}
	}

	async function onReactivate(id) {
		setActionMsg('');
		try {
			await reactivateProvider(id);
			await flash('Proveedor reactivado.');
		} catch (err) {
			setActionMsg(err.response?.data?.message || 'No se pudo reactivar.');
		}
	}

	async function onRunReminders() {
		setJobLoading(true);
		setActionMsg('');
		try {
			const res = await runReminders24h();
			setActionMsg(res.message || 'Recordatorios ejecutados.');
		} catch (err) {
			setActionMsg(err.response?.data?.message || 'No se pudo ejecutar el job.');
		} finally {
			setJobLoading(false);
		}
	}

	return (
		<div className="mx-auto w-full max-w-[1200px] px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
			<Link
				className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline min-h-11 mb-4"
				to='/'
			>
				← Inicio
			</Link>

			<header className="mb-7">
				<p className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70 mb-1">
					Administración del sistema
				</p>
				<h1 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold tracking-tight text-foreground flex flex-wrap items-center gap-2">
					<Users size={24} className="text-primary shrink-0" aria-hidden />
					Gestión de proveedores
				</h1>
				<p className="text-sm text-muted-foreground mt-1 max-w-[56ch]">
					Revisa solicitudes en revisión, activa perfiles públicos, rechaza con motivo y desactiva temporalmente cuentas aprobadas si hay incidencias.
				</p>
			</header>

			<section
				className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6 mb-6"
				aria-labelledby="admin-jobs-heading"
			>
				<h2
					id="admin-jobs-heading"
					className="text-sm font-bold text-foreground flex items-center gap-2 mb-1"
				>
					<ShieldCheck size={16} className="text-primary" aria-hidden />
					Tareas administrativas
				</h2>
				<p className="text-xs text-muted-foreground mb-4">
					Ejecuta jobs del sistema de forma manual (solo administrador).
				</p>
				<Button
					type='button'
					variant="outline"
					size="sm"
					disabled={jobLoading}
					onClick={onRunReminders}
					className="h-9 gap-1.5"
				>
					<Play size={13} aria-hidden />
					{jobLoading ? 'Ejecutando…' : 'Ejecutar recordatorios 24h'}
				</Button>
			</section>

			{actionMsg ? (
				<div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 px-3.5 py-3 text-sm text-emerald-700 dark:text-emerald-400 font-medium mb-4">
					{actionMsg}
				</div>
			) : null}
			{error ? (
				<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive mb-4" role="alert">
					{error}
				</p>
			) : null}
			{loading ? (
				<p className="text-muted-foreground mb-6" role="status" aria-live="polite">
					Cargando panel…
				</p>
			) : null}

			{/* Proveedores pendientes */}
			<section className="mb-10" aria-labelledby="pending-heading">
				<div className="flex flex-wrap items-center justify-between gap-3 mb-4">
					<h2 id="pending-heading" className="text-lg font-bold text-foreground m-0 flex items-center gap-2">
						Proveedores pendientes
						<span
							className="inline-flex min-w-8 justify-center rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-xs font-black text-amber-900 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800 tabular-nums"
							aria-label={`${pendingTotal} pendientes`}
						>
							{pendingTotal}
						</span>
					</h2>
				</div>

				{!loading && pendingItems.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center mb-6">
						<Check size={28} className="mx-auto text-emerald-600 dark:text-emerald-400 mb-2" aria-hidden />
						<p className="font-semibold text-foreground m-0">Sin solicitudes pendientes</p>
					</div>
				) : null}

				{pendingItems.length > 0 ? (
					<div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm mb-6">
						<table className="w-full border-collapse text-sm min-w-[880px]">
							<thead>
								<tr>
									<th scope="col" className={TH_CLS}>Nombre</th>
									<th scope="col" className={TH_CLS}>Tipo</th>
									<th scope="col" className={TH_CLS}>Correo</th>
									<th scope="col" className={TH_CLS}>
										<span className="inline-flex items-center gap-1">
											<Calendar size={12} aria-hidden /> Solicitud
										</span>
									</th>
									<th scope="col" className={TH_CLS}>Documentos</th>
									<th scope="col" className={TH_CLS}>Teléfono</th>
									<th scope="col" className={TH_CLS}>Acciones</th>
								</tr>
							</thead>
							<tbody>
								{pendingItems.map((p) => (
									<tr key={String(p._id)} className="hover:bg-muted/20 transition-colors">
										<td className={TD_CLS}>
											<span className="font-semibold text-foreground">
												{p.name} {p.lastName}
											</span>
										</td>
										<td className={TD_CLS}>
											<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-primary/10 text-primary capitalize">
												{p.providerType}
											</span>
										</td>
										<td className={`${TD_CLS} text-muted-foreground`}>{p.email}</td>
										<td className={`${TD_CLS} text-muted-foreground whitespace-nowrap`}>
											{formatDt(p.requestedAt || p.createdAt)}
										</td>
										<td className={TD_CLS}>
											{Array.isArray(p.documents) && p.documents.length > 0 ? (
												<ul className="list-none m-0 p-0 flex flex-col gap-1 max-w-[14rem]">
													{p.documents.map((d, i) => {
														const href = resolveBackendAssetUrl(d.url);
														return (
															<li key={`${p._id}-doc-${i}`}>
																<a
																	href={href || '#'}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
																>
																	<FileText size={12} aria-hidden />
																	{d.label || `Archivo ${i + 1}`}
																</a>
															</li>
														);
													})}
												</ul>
											) : (
												<span className="text-muted-foreground text-xs">—</span>
											)}
										</td>
										<td className={`${TD_CLS} text-muted-foreground`}>{p.phone || '—'}</td>
										<td className={TD_CLS}>
											<div className="flex flex-wrap gap-2">
												<button
													type='button'
													className="inline-flex h-8 items-center gap-1 px-3 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-600 border-0 cursor-pointer"
													onClick={() => {
														if (window.confirm('¿Aprobar este proveedor? Recibirá un correo de activación.')) {
															onApprove(p._id);
														}
													}}
												>
													<Check size={12} aria-hidden /> Aprobar
												</button>
												<button
													type='button'
													className="inline-flex h-8 items-center gap-1 px-3 rounded-lg border border-red-200 bg-white dark:bg-card text-red-800 dark:text-red-300 dark:border-red-900 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
													onClick={() => onReject(p._id)}
												>
													<X size={12} aria-hidden /> Rechazar
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : null}
			</section>

			{/* Activos */}
			<section className="mb-10" aria-labelledby="active-heading">
				<h2 id="active-heading" className="text-lg font-bold text-foreground m-0 mb-4 flex items-center gap-2">
					<UserCheck size={20} className="text-primary" aria-hidden />
					Proveedores activos (visibles en mapa y buscador)
				</h2>
				{activeItems.length === 0 ? (
					<p className="text-sm text-muted-foreground">No hay proveedores aprobados.</p>
				) : (
					<div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
						<table className="w-full border-collapse text-sm">
							<thead>
								<tr>
									<th scope="col" className={TH_CLS}>Nombre</th>
									<th scope="col" className={TH_CLS}>Tipo</th>
									<th scope="col" className={TH_CLS}>Correo</th>
									<th scope="col" className={TH_CLS}>Acciones</th>
								</tr>
							</thead>
							<tbody>
								{activeItems.map((p) => (
									<tr key={String(p._id)} className="hover:bg-muted/20 transition-colors">
										<td className={TD_CLS}>
											<span className="font-semibold">{p.name} {p.lastName}</span>
										</td>
										<td className={TD_CLS}>
											<span className="capitalize text-xs font-bold text-primary">{p.providerType}</span>
										</td>
										<td className={`${TD_CLS} text-muted-foreground`}>{p.email}</td>
										<td className={TD_CLS}>
											<button
												type="button"
												className="inline-flex h-8 items-center gap-1 px-3 rounded-lg border border-amber-700/40 bg-amber-50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-950/50 cursor-pointer"
												onClick={() => {
													if (window.confirm('¿Desactivar temporalmente este perfil público?')) {
														onSuspend(p._id);
													}
												}}
											>
												<Ban size={12} aria-hidden /> Desactivar
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			{/* Suspendidos */}
			<section className="mb-10" aria-labelledby="suspended-heading">
				<h2 id="suspended-heading" className="text-lg font-bold text-foreground m-0 mb-4 flex items-center gap-2">
					<Ban size={20} className="text-amber-700 dark:text-amber-400" aria-hidden />
					Desactivados por administración
				</h2>
				{suspendedItems.length === 0 ? (
					<p className="text-sm text-muted-foreground">No hay perfiles suspendidos.</p>
				) : (
					<div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
						<table className="w-full border-collapse text-sm">
							<thead>
								<tr>
									<th scope="col" className={TH_CLS}>Nombre</th>
									<th scope="col" className={TH_CLS}>Correo</th>
									<th scope="col" className={TH_CLS}>Motivo</th>
									<th scope="col" className={TH_CLS}>Acciones</th>
								</tr>
							</thead>
							<tbody>
								{suspendedItems.map((p) => (
									<tr key={String(p._id)} className="hover:bg-muted/20 transition-colors">
										<td className={TD_CLS}>
											<span className="font-semibold">{p.name} {p.lastName}</span>
											<span className="block text-xs text-muted-foreground capitalize">{p.providerType}</span>
										</td>
										<td className={`${TD_CLS} text-muted-foreground`}>{p.email}</td>
										<td className={`${TD_CLS} text-muted-foreground max-w-[240px]`}>
											{p.providerProfile?.adminSuspendReason || '—'}
										</td>
										<td className={TD_CLS}>
											<button
												type="button"
												className="inline-flex h-8 items-center gap-1 px-3 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-600 border-0 cursor-pointer"
												onClick={() => onReactivate(p._id)}
											>
												<RotateCcw size={12} aria-hidden /> Reactivar
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			{/* Auditoría */}
			<section aria-labelledby="audit-heading">
				<h2 id="audit-heading" className="text-lg font-bold text-foreground m-0 mb-4 flex items-center gap-2">
					<ScrollText size={20} className="text-primary" aria-hidden />
					Log de auditoría (acciones recientes)
				</h2>
				{auditItems.length === 0 ? (
					<p className="text-sm text-muted-foreground">Sin registros aún.</p>
				) : (
					<div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
						<table className="w-full border-collapse text-sm">
							<thead>
								<tr>
									<th scope="col" className={TH_CLS}>Fecha</th>
									<th scope="col" className={TH_CLS}>Acción</th>
									<th scope="col" className={TH_CLS}>Administrador</th>
									<th scope="col" className={TH_CLS}>Detalle</th>
								</tr>
							</thead>
							<tbody>
								{auditItems.map((row) => {
									const actor = row.actorId;
									const actorLabel = actor
										? `${actor.name || ''} ${actor.lastName || ''}`.trim() || actor.email
										: '—';
									return (
										<tr key={String(row._id)} className="hover:bg-muted/15">
											<td className={`${TD_CLS} whitespace-nowrap text-muted-foreground`}>
												{formatDt(row.createdAt)}
											</td>
											<td className={`${TD_CLS} font-mono text-xs`}>{row.action}</td>
											<td className={TD_CLS}>{actorLabel}</td>
											<td className={`${TD_CLS} text-muted-foreground text-xs max-w-md`}>
												<pre className="m-0 font-sans whitespace-pre-wrap break-all">
													{JSON.stringify(row.metadata || {}, null, 0)}
												</pre>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</section>
		</div>
	);
}
