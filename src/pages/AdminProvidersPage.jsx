import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { approveProvider, fetchPendingProviders, rejectProvider } from '../services/admin';
import { runReminders24h } from '../services/adminJobs';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Users, Play, Check, X } from 'lucide-react';

const TH_CLS =
	'px-4 py-3 text-left text-[0.72rem] font-bold uppercase tracking-wide text-muted-foreground border-b border-border bg-muted/40 dark:bg-muted/20 whitespace-nowrap';
const TD_CLS = 'px-4 py-3 text-left text-sm border-b border-border/60 align-top';

export function AdminProvidersPage() {
	const { user, loading: authLoading } = useAuth();
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [actionMsg, setActionMsg] = useState('');
	const [jobLoading, setJobLoading] = useState(false);

	const reload = useCallback(async () => {
		const res = await fetchPendingProviders({ page: 1, limit: 50 });
		setData(res);
	}, []);

	useEffect(() => {
		if (authLoading || !user || user.role !== 'admin') return;
		let cancelled = false;
		(async () => {
			try {
				setLoading(true);
				setError('');
				await reload();
			} catch (err) {
				if (!cancelled) setError(err.response?.data?.message || 'Error al cargar solicitudes.');
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
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
		return <Navigate to='/login' replace state={{ from: '/admin/proveedores' }} />;
	}

	if (user.role !== 'admin') {
		return (
			<div className="mx-auto w-full max-w-[1200px] px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
				<Link
					className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline min-h-11 mb-4"
					to='/'
				>
					← Inicio
				</Link>
				<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
					Se requiere rol administrador.
				</p>
			</div>
		);
	}

	const items = data?.items || [];

	async function onApprove(id) {
		setActionMsg('');
		try {
			await approveProvider(id);
			setActionMsg('Proveedor aprobado.');
			await reload();
		} catch (err) {
			setActionMsg(err.response?.data?.message || 'No se pudo aprobar.');
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

	async function onReject(id) {
		const reason = window.prompt('Motivo del rechazo (obligatorio):');
		if (!reason || !reason.trim()) return;
		setActionMsg('');
		try {
			await rejectProvider(id, reason.trim());
			setActionMsg('Proveedor rechazado.');
			await reload();
		} catch (err) {
			setActionMsg(err.response?.data?.message || 'No se pudo rechazar.');
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

			{/* Page header */}
			<header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
				<div>
					<p className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70 mb-1">
						Administración
					</p>
					<h1 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold tracking-tight text-foreground flex items-center gap-2">
						<Users size={24} className="text-primary" aria-hidden />
						Proveedores en revisión
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Solicitudes de registro pendientes de aprobación.
					</p>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
						{items.length} pendiente{items.length !== 1 ? 's' : ''}
					</span>
				</div>
			</header>

			{/* Admin jobs */}
			<section
				className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6 mb-5"
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
					Ejecuta jobs del sistema de forma manual. El endpoint es{' '}
					<code className="text-[0.72rem] bg-muted px-1 py-0.5 rounded">POST /api/admin/jobs/reminders24h/run</code>
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

			{/* Feedback messages */}
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
				<p className="text-muted-foreground mb-4" role="status" aria-live="polite">
					Cargando solicitudes…
				</p>
			) : null}

			{/* Providers table */}
			{!loading && items.length === 0 ? (
				<div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 dark:bg-muted/5 p-12 text-center">
					<div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
						<Check size={22} className="text-emerald-600 dark:text-emerald-400" aria-hidden />
					</div>
					<p className="font-semibold text-foreground">Todo al día</p>
					<p className="text-sm text-muted-foreground">No hay solicitudes pendientes en este momento.</p>
				</div>
			) : null}

			{items.length > 0 ? (
				<div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
					<table className="w-full border-collapse text-sm">
						<thead>
							<tr>
								<th scope="col" className={TH_CLS}>Nombre</th>
								<th scope="col" className={TH_CLS}>Correo</th>
								<th scope="col" className={TH_CLS}>Tipo</th>
								<th scope="col" className={TH_CLS}>Teléfono</th>
								<th scope="col" className={TH_CLS}>Acciones</th>
							</tr>
						</thead>
						<tbody>
							{items.map((p) => (
								<tr key={String(p._id)} className="hover:bg-muted/20 transition-colors">
									<td className={TD_CLS}>
										<span className="font-semibold text-foreground">
											{p.name} {p.lastName}
										</span>
									</td>
									<td className={`${TD_CLS} text-muted-foreground`}>{p.email}</td>
									<td className={TD_CLS}>
										<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-primary/10 text-primary capitalize">
											{p.providerType}
										</span>
									</td>
									<td className={`${TD_CLS} text-muted-foreground`}>{p.phone || '—'}</td>
									<td className={TD_CLS}>
										<div className="flex flex-wrap gap-2">
											<button
												type='button'
												className="inline-flex h-8 items-center gap-1 px-3 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-600 transition-colors border-0 cursor-pointer"
												onClick={() => onApprove(p._id)}
											>
												<Check size={12} aria-hidden /> Aprobar
											</button>
											<button
												type='button'
												className="inline-flex h-8 items-center gap-1 px-3 rounded-lg border border-red-200 bg-white dark:bg-card text-red-800 dark:text-red-300 dark:border-red-900 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
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
		</div>
	);
}
