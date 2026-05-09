import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Search, Stethoscope, Bell, Users, Calendar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../lib/userRoles';
import { fetchVetPatients } from '../services/vet';
import { resolveBackendAssetUrl } from '../services/api';
import { cn } from '../lib/utils';

const PAGE_CLS =
	'mx-auto w-full max-w-[1200px] px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]';

const PROXIMO_OPTIONS = [
	{ value: '', label: 'Todos' },
	{ value: '7', label: 'Próx. control 7 días' },
	{ value: '15', label: 'Próx. control 15 días' },
	{ value: '30', label: 'Próx. control 30 días' }
];

function ownerLine(o) {
	if (!o) return '—';
	return `${o.name || ''} ${o.lastName || ''}`.trim() || '—';
}

function formatLastVisit(iso) {
	if (!iso) return '—';
	try {
		return new Date(iso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });
	} catch {
		return '—';
	}
}

function formatControlDate(iso) {
	if (!iso) return '—';
	try {
		return new Date(iso).toLocaleDateString('es-CL', { dateStyle: 'long' });
	} catch {
		return '—';
	}
}

export function VetPatientsPage() {
	const { user, loading: authLoading } = useAuth();
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [qInput, setQInput] = useState('');
	const [qDebounced, setQDebounced] = useState('');
	const [proximoDias, setProximoDias] = useState('');

	const load = useCallback(async () => {
		setLoading(true);
		setError('');
		try {
			const params = {};
			if (qDebounced) params.q = qDebounced;
			if (proximoDias) params.proximoDias = proximoDias;
			const data = await fetchVetPatients(params);
			setItems(Array.isArray(data.items) ? data.items : []);
		} catch (e) {
			setError(e.response?.data?.message || 'No se pudo cargar la lista de pacientes.');
			setItems([]);
		} finally {
			setLoading(false);
		}
	}, [qDebounced, proximoDias]);

	useEffect(() => {
		const t = setTimeout(() => setQDebounced(qInput.trim()), 380);
		return () => clearTimeout(t);
	}, [qInput]);

	useEffect(() => {
		if (authLoading || !user || !hasRole(user, 'proveedor') || user.providerType !== 'veterinaria') return;
		load();
	}, [authLoading, user, load]);

	useEffect(() => {
		if (authLoading || !user || !hasRole(user, 'proveedor') || user.providerType !== 'veterinaria') return;
		const id = setInterval(load, 45000);
		const onVis = () => {
			if (document.visibilityState === 'visible') load();
		};
		window.addEventListener('focus', load);
		document.addEventListener('visibilitychange', onVis);
		return () => {
			clearInterval(id);
			window.removeEventListener('focus', load);
			document.removeEventListener('visibilitychange', onVis);
		};
	}, [authLoading, user, load]);

	if (authLoading) {
		return (
			<div className={PAGE_CLS}>
				<p className="text-muted-foreground">Cargando…</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace state={{ from: '/proveedor/pacientes' }} />;
	}

	if (!hasRole(user, 'proveedor') || user.providerType !== 'veterinaria') {
		return (
			<div className={PAGE_CLS}>
				<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
					Solo cuentas de veterinarias pueden gestionar pacientes.
				</p>
			</div>
		);
	}

	return (
		<div className={PAGE_CLS}>
			<div className="flex flex-wrap items-center gap-3 mb-5">
				<Link
					className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline min-h-10"
					to="/proveedor"
				>
					← Panel clínica
				</Link>
			</div>

			<header className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden mb-5">
				<div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/35">
					<Users className="size-5 text-primary shrink-0" aria-hidden />
					<span className="text-[0.72rem] font-bold uppercase tracking-widest text-primary/75">Pacientes</span>
				</div>
				<div className="px-5 py-4">
					<h1 className="text-[clamp(1.25rem,2.2vw,1.65rem)] font-bold tracking-tight text-foreground m-0 mb-1">
						Mascotas atendidas
					</h1>
					<p className="text-sm text-muted-foreground m-0 max-w-[52ch]">
						Pacientes con al menos una cita <strong>completada</strong> en tu clínica. La lista se actualiza sola cada
						minuto y al volver a esta pestaña.
					</p>
				</div>
			</header>

			<div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-5">
				<label className="relative flex-1 min-w-[200px]">
					<span className="sr-only">Buscar por mascota o dueño</span>
					<Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
					<input
						type="search"
						className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm"
						placeholder="Buscar por mascota o dueño…"
						value={qInput}
						onChange={(e) => setQInput(e.target.value)}
						aria-label="Buscar por nombre de mascota o dueño"
					/>
				</label>
				<div className="flex items-center gap-2">
					<Bell className="size-4 text-muted-foreground shrink-0 hidden sm:block" aria-hidden />
					<select
						className="h-11 rounded-xl border border-input bg-background px-3 text-sm font-medium min-w-[11rem]"
						value={proximoDias}
						onChange={(e) => setProximoDias(e.target.value)}
						aria-label="Filtrar por próximo control"
					>
						{PROXIMO_OPTIONS.map((o) => (
							<option key={o.value || 'all'} value={o.value}>
								{o.label}
							</option>
						))}
					</select>
				</div>
			</div>

			{error ? (
				<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive mb-4">
					{error}
				</p>
			) : null}

			{loading ? (
				<p className="text-muted-foreground">Cargando pacientes…</p>
			) : items.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
					<Stethoscope className="mx-auto size-10 text-muted-foreground/60 mb-3" aria-hidden />
					<p className="font-semibold text-foreground m-0 mb-1">No hay pacientes en esta vista</p>
					<p className="text-sm text-muted-foreground m-0">
						Completa citas en el panel o ajusta filtros / búsqueda.
					</p>
				</div>
			) : (
				<ul className="flex flex-col gap-3 list-none m-0 p-0">
					{items.map((row) => {
						const fotoSrc = row.pet?.fotoUrl ? resolveBackendAssetUrl(row.pet.fotoUrl) : null;
						return (
							<li key={row.petId}>
								<Link
									to={`/proveedor/pacientes/${row.petId}/ficha`}
									state={{
										pendingEncounterAppointmentId: row.pendingEncounterAppointmentId || undefined
									}}
									className={cn(
										'flex flex-wrap gap-4 items-center rounded-2xl border border-border bg-card p-4 shadow-sm',
										'no-underline text-foreground hover:border-primary/40 hover:bg-muted/30 transition-colors'
									)}
								>
									<div className="size-14 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
										{fotoSrc ? (
											<img src={fotoSrc} alt="" className="size-full object-cover" loading="lazy" />
										) : (
											<div className="size-full flex items-center justify-center text-2xl" aria-hidden>
												🐾
											</div>
										)}
									</div>
									<div className="flex-1 min-w-[200px]">
										<p className="font-bold text-foreground m-0">
											{row.pet?.name || '—'}{' '}
											<span className="font-normal text-muted-foreground">
												· {row.pet?.species || '—'}
												{row.pet?.breed ? ` · ${row.pet.breed}` : ''}
											</span>
										</p>
										<p className="text-sm text-muted-foreground m-0 mt-1">
											Dueño: {ownerLine(row.owner)}
										</p>
										<div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
											<span className="inline-flex items-center gap-1">
												<Calendar className="size-3.5 shrink-0" aria-hidden />
												Última atención: {formatLastVisit(row.lastVisitAt)}
											</span>
											{row.proximoControl?.fecha ? (
												<span className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-300">
													<Bell className="size-3.5 shrink-0" aria-hidden />
													Próx. control: {formatControlDate(row.proximoControl.fecha)}
												</span>
											) : null}
										</div>
									</div>
									<div className="flex flex-wrap gap-2 items-center justify-end">
										{row.pendingEncounterAppointmentId ? (
											<span className="inline-flex rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs font-bold px-2.5 py-1 border border-amber-300/60">
												Sin registro clínico
											</span>
										) : null}
										<span className="text-sm font-bold text-primary">Ver ficha →</span>
									</div>
								</Link>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
