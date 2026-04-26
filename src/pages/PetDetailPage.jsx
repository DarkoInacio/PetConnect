import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronLeft, Stethoscope, Edit, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getPet, markPetDeceased } from '../services/pets';
import { PetPhoto } from '../components/PetPhoto';
import { cn } from '../lib/utils';
import { formatCivilDateDisplayUtc } from '../constants/chileTime';

const PAGE_CLS = 'mx-auto w-full max-w-3xl px-4 sm:px-5 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))]';
const BACK_LINK_CLS = 'inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline min-h-11 mb-4';
const ERROR_CLS = 'rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive';
const CARD_CLS = 'rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6';

function InfoField({ label, value }) {
	if (!value) return null;
	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
			<span className="text-sm font-medium text-foreground capitalize">{value}</span>
		</div>
	);
}

export function PetDetailPage() {
	const { petId } = useParams();
	const { user, loading: authLoading } = useAuth();
	const [pet, setPet] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [msg, setMsg] = useState('');

	useEffect(() => {
		if (authLoading || !user || user.role !== 'dueno' || !petId) return;
		const c = new AbortController();
		(async () => {
			try {
				setLoading(true);
				const data = await getPet(petId, c.signal);
				setPet(data.pet || null);
			} catch (err) {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setError(err.response?.data?.message || 'No se pudo cargar la mascota.');
			} finally {
				setLoading(false);
			}
		})();
		return () => c.abort();
	}, [authLoading, user, petId]);

	if (authLoading || loading) {
		return (
			<div className={PAGE_CLS}>
				<div className={cn(CARD_CLS, 'animate-pulse')} role="status" aria-live="polite">
					<p className="text-muted-foreground m-0">Cargando mascota…</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return <Navigate to='/login' replace state={{ from: `/mascotas/${petId}` }} />;
	}

	if (user.role !== 'dueno') {
		return (
			<div className={PAGE_CLS}>
				<Link className={BACK_LINK_CLS} to='/'>
					<ChevronLeft className="w-4 h-4" aria-hidden="true" /> Inicio
				</Link>
				<p className={ERROR_CLS} role="alert">Solo dueños.</p>
			</div>
		);
	}

	if (error || !pet) {
		return (
			<div className={PAGE_CLS}>
				<Link className={BACK_LINK_CLS} to='/cuenta/mascotas'>
					<ChevronLeft className="w-4 h-4" aria-hidden="true" /> Mis mascotas
				</Link>
				<p className={ERROR_CLS} role="alert">{error || 'No encontrada.'}</p>
			</div>
		);
	}

	const id = String(pet._id || petId);
	const isDeceased = pet.status === 'deceased';

	async function onMarkDeceased() {
		if (!window.confirm('¿Marcar esta mascota como fallecida? La ficha dejará de ser editable.')) return;
		setMsg('');
		setError('');
		try {
			await markPetDeceased(id);
			const data = await getPet(id);
			setPet(data.pet);
			setMsg('Registro actualizado.');
		} catch (err) {
			setError(err.response?.data?.message || 'No se pudo actualizar.');
		}
	}

	return (
		<div className={PAGE_CLS}>
			<Link className={BACK_LINK_CLS} to='/cuenta/mascotas'>
				<ChevronLeft className="w-4 h-4" aria-hidden="true" /> Mis mascotas
			</Link>

			{/* Header card: foto + info principal */}
			<div className={cn(CARD_CLS, 'flex flex-col sm:flex-row gap-5 items-start mb-4')}>
				<div className="w-36 h-36 sm:w-40 sm:h-40 shrink-0 rounded-xl overflow-hidden border border-border bg-muted">
					<PetPhoto petId={id} alt={pet.name} className="w-full h-full object-cover" />
				</div>
				<div className="flex-1 min-w-0 flex flex-col justify-center">
					<p className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70 mb-1.5">Ficha de mascota</p>
					<h1 className="text-[clamp(1.4rem,2.5vw,2rem)] font-bold tracking-tight text-foreground leading-tight mb-2">{pet.name}</h1>
					<div className="flex flex-wrap gap-2">
						<span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-bold capitalize">
							{pet.species}
						</span>
						<span
							className={cn(
								'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold',
								isDeceased
									? 'bg-muted text-muted-foreground'
									: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
							)}
						>
							{isDeceased ? 'Fallecida' : 'Activa'}
						</span>
					</div>
				</div>
			</div>

			{/* Grid de campos informativos */}
			<div className={cn(CARD_CLS, 'mb-4')}>
				<h2 className="text-sm font-bold text-foreground mb-4">Información</h2>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
					<InfoField label="Especie" value={pet.species} />
					<InfoField label="Sexo" value={pet.sex} />
					<InfoField label="Raza" value={pet.breed || 'Sin especificar'} />
					<InfoField label="Estado" value={isDeceased ? 'Fallecida' : 'Activa'} />
					{pet.color && <InfoField label="Color" value={pet.color} />}
					{pet.birthDate && (
						<InfoField
							label="Fecha de nacimiento"
							value={formatCivilDateDisplayUtc(pet.birthDate)}
						/>
					)}
				</div>
			</div>

			{/* Mensajes */}
			{error && (
				<p className={cn(ERROR_CLS, 'mb-4')} role="alert" aria-live="assertive">{error}</p>
			)}
			{msg && (
				<div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-3 text-sm text-emerald-700 dark:text-emerald-400 mb-4">
					<CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
					{msg}
				</div>
			)}

			{/* Acciones */}
			<div className={cn(CARD_CLS, 'flex flex-col gap-3')}>
				<h2 className="text-sm font-bold text-foreground mb-1">Acciones</h2>
				<div className="flex flex-wrap gap-2">
					<Link
						to={`/mascotas/${id}/ficha`}
						className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-bold no-underline hover:bg-primary/90 transition-colors"
					>
						<Stethoscope className="w-4 h-4" aria-hidden="true" />
						Ver historial clínico
					</Link>
					{!isDeceased && (
						<Link
							to={`/mascotas/${id}/edit`}
							className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-border bg-background text-foreground text-sm font-bold no-underline hover:bg-muted transition-colors"
						>
							<Edit className="w-4 h-4" aria-hidden="true" />
							Editar datos
						</Link>
					)}
				</div>
				{!isDeceased && (
					<div className="border-t border-border pt-3 mt-1">
						<p className="text-xs text-muted-foreground mb-2">Zona de riesgo</p>
						<button
							type='button'
							className="inline-flex items-center gap-2 h-10 px-4 py-2 text-sm font-bold rounded-xl border-2 border-red-200 bg-white dark:bg-card text-red-700 dark:text-red-400 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
							onClick={onMarkDeceased}
						>
							<AlertTriangle className="w-4 h-4" aria-hidden="true" />
							Marcar como fallecida
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
