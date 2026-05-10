import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { ChevronLeft, ClipboardList, Stethoscope, Calendar, ChevronRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../lib/userRoles';
import { getPet } from '../services/pets';
import { fetchVetPatients, listVetClinicalEncounters } from '../services/vet';
import { cn } from '../lib/utils';

const PAGE_CLS =
	'mx-auto w-full max-w-3xl px-4 sm:px-5 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))]';

const ENCOUNTER_TYPE_COLORS = {
	consulta: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
	vacuna: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
	vacunacion: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
};

function encounterTypeColor(type) {
	const key = (type || '').toLowerCase();
	return ENCOUNTER_TYPE_COLORS[key] || 'bg-muted text-muted-foreground';
}

export function VetPetMedicalPage() {
	const { petId } = useParams();
	const location = useLocation();
	const { user, loading: authLoading } = useAuth();
	const [pet, setPet] = useState(null);
	const [encounters, setEncounters] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const pendingFromNav = location.state?.pendingEncounterAppointmentId || '';

	const [pendingAppointmentId, setPendingAppointmentId] = useState(pendingFromNav || '');

	const clinicalHref = useMemo(() => {
		if (!pendingAppointmentId || !petId) return '';
		const qs = new URLSearchParams({
			appointmentId: pendingAppointmentId,
			petId
		});
		return `/proveedor/atencion-clinica?${qs.toString()}`;
	}, [pendingAppointmentId, petId]);

	useEffect(() => {
		if (authLoading || !user || !hasRole(user, 'proveedor') || user.providerType !== 'veterinaria' || !petId)
			return;

		const hadPendingFromNav = Boolean(location.state?.pendingEncounterAppointmentId);

		const c = new AbortController();
		(async () => {
			try {
				setLoading(true);
				setError('');
				const [petRes, encRes] = await Promise.all([
					getPet(petId, c.signal),
					listVetClinicalEncounters(petId, c.signal)
				]);
				setPet(petRes?.pet || null);
				setEncounters(Array.isArray(encRes.encounters) ? encRes.encounters : []);

				if (!hadPendingFromNav) {
					const listRes = await fetchVetPatients({}, c.signal);
					const row = Array.isArray(listRes.items)
						? listRes.items.find((it) => String(it.petId) === String(petId))
						: null;
					setPendingAppointmentId(row?.pendingEncounterAppointmentId || '');
				}
			} catch (err) {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setError(err.response?.data?.message || 'No se pudo cargar la ficha.');
				setPet(null);
				setEncounters([]);
			} finally {
				setLoading(false);
			}
		})();
		return () => c.abort();
	}, [authLoading, user, petId, location.state]);

	useEffect(() => {
		if (authLoading || !user || !hasRole(user, 'proveedor') || user.providerType !== 'veterinaria' || !petId) return;

		async function reload() {
			try {
				const [encRes, listRes] = await Promise.all([
					listVetClinicalEncounters(petId),
					fetchVetPatients({})
				]);
				setEncounters(Array.isArray(encRes.encounters) ? encRes.encounters : []);
				const row = Array.isArray(listRes.items)
					? listRes.items.find((it) => String(it.petId) === String(petId))
					: null;
				setPendingAppointmentId(row?.pendingEncounterAppointmentId || '');
			} catch {
				/* ignore */
			}
		}

		const id = setInterval(reload, 20000);
		const onVis = () => {
			if (document.visibilityState === 'visible') reload();
		};
		window.addEventListener('focus', reload);
		document.addEventListener('visibilitychange', onVis);
		return () => {
			clearInterval(id);
			window.removeEventListener('focus', reload);
			document.removeEventListener('visibilitychange', onVis);
		};
	}, [authLoading, user, petId]);

	if (authLoading || loading) {
		return (
			<div className={PAGE_CLS}>
				<p className="text-muted-foreground">Cargando ficha…</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace state={{ from: `/proveedor/pacientes/${petId}/ficha` }} />;
	}

	if (!hasRole(user, 'proveedor') || user.providerType !== 'veterinaria') {
		return (
			<div className={PAGE_CLS}>
				<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
					Solo veterinarias pueden ver esta ficha.
				</p>
			</div>
		);
	}

	if (error || !pet) {
		return (
			<div className={PAGE_CLS}>
				<Link className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline mb-4" to="/proveedor/pacientes">
					<ChevronLeft className="size-4" /> Lista de pacientes
				</Link>
				<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
					{error || 'Mascota no encontrada o sin acceso.'}
				</p>
			</div>
		);
	}

	return (
		<div className={PAGE_CLS}>
			<Link
				className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline min-h-11 mb-4"
				to="/proveedor/pacientes"
			>
				<ChevronLeft className="size-4" aria-hidden /> Lista de pacientes
			</Link>

			<header className="mb-6">
				<p className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70 mb-1">
					Historial en tu clínica
				</p>
				<h1 className="text-[clamp(1.35rem,2.5vw,1.85rem)] font-bold tracking-tight text-foreground m-0">
					{pet.name}
				</h1>
				<p className="text-sm text-muted-foreground mt-1 mb-0 capitalize">
					{pet.species}
					{pet.breed ? ` · ${pet.breed}` : ''}
				</p>
				<p className="text-sm text-muted-foreground m-0 mt-1">
					Dueño:{' '}
					<span className="font-semibold text-foreground">
						{pet.owner ? `${pet.owner.name || ''} ${pet.owner.lastName || ''}`.trim() : '—'}
					</span>
				</p>
			</header>

			{pendingAppointmentId ? (
				<div
					className="rounded-xl border border-amber-400/70 bg-amber-50 dark:bg-amber-950/25 px-4 py-3 mb-5 flex flex-wrap gap-3 items-center justify-between"
					role="status"
				>
					<p className="text-sm text-amber-950 dark:text-amber-100 m-0 flex items-start gap-2">
						<AlertCircle className="size-5 shrink-0 mt-0.5" aria-hidden />
						<span>
							Hay una cita <strong>completada</strong> sin registro clínico. Puedes documentar la atención ahora.
						</span>
					</p>
					<Link
						to={clinicalHref}
						className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground no-underline hover:bg-primary/90 shrink-0"
					>
						Nuevo registro
					</Link>
				</div>
			) : null}

			<section aria-labelledby="vet-enc-heading">
				<div className="flex items-center gap-2 mb-3">
					<ClipboardList className="size-4 text-primary" aria-hidden />
					<h2 id="vet-enc-heading" className="text-sm font-bold text-foreground m-0">
						Tus atenciones registradas
					</h2>
				</div>
				<p className="text-xs text-muted-foreground m-0 mb-4">
					Solo ves los registros que tú misma creaste en esta clínica.
				</p>

				{encounters.length === 0 ? (
					<div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
						<Stethoscope className="size-10 text-muted-foreground/50" aria-hidden />
						<p className="font-semibold text-foreground m-0">Aún no registras atenciones para esta mascota</p>
						<p className="text-sm text-muted-foreground m-0">
							Cuando completes una cita, usa «Registrar en ficha médica» o el aviso de arriba si aplica.
						</p>
					</div>
				) : (
					<ul className="list-none p-0 m-0 flex flex-col gap-3" role="list">
						{encounters.map((row) => (
							<li key={String(row.id)} className="m-0 p-0">
								<Link
									to={`/proveedor/pacientes/${petId}/atencion/${row.id}`}
									className="flex items-center gap-4 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all p-4 no-underline group"
								>
									<div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 shrink-0">
										<Calendar className="w-5 h-5 text-primary" aria-hidden />
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-0.5 flex-wrap">
											<span
												className={cn(
													'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold capitalize',
													encounterTypeColor(row.type)
												)}
											>
												{row.type}
											</span>
											<time className="text-xs text-muted-foreground" dateTime={row.occurredAt}>
												{new Date(row.occurredAt).toLocaleString('es-CL', {
													dateStyle: 'medium',
													timeStyle: 'short'
												})}
											</time>
										</div>
										{row.motivo ? (
											<p className="text-sm text-foreground m-0 truncate">
												{row.motivo.slice(0, 120)}
												{row.motivo.length > 120 ? '…' : ''}
											</p>
										) : null}
									</div>
									<ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-foreground" aria-hidden />
								</Link>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
