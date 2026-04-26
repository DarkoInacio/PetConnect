import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { PawPrint, Plus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { listPets } from '../services/pets';
import { PetPhoto } from '../components/PetPhoto';
import { cn } from '../lib/utils';

export function MyPetsPage() {
	const { user, loading: authLoading } = useAuth();
	const [pets, setPets] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		if (authLoading || !user || user.role !== 'dueno') return;
		const c = new AbortController();
		(async () => {
			try {
				setLoading(true);
				setError('');
				const data = await listPets({}, c.signal);
				setPets(Array.isArray(data.pets) ? data.pets : []);
			} catch (err) {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setError(err.response?.data?.message || 'No se pudieron cargar las mascotas.');
			} finally {
				setLoading(false);
			}
		})();
		return () => c.abort();
	}, [authLoading, user]);

	if (authLoading) {
		return (
			<div className="mx-auto w-full max-w-[1200px] px-4 sm:px-5 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
				<div className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6" role="status" aria-live="polite">
					<p className="text-muted-foreground m-0">Cargando…</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return <Navigate to='/login' replace state={{ from: '/cuenta/mascotas' }} />;
	}

	if (user.role !== 'dueno') {
		return (
			<div className="mx-auto w-full max-w-[1200px] px-4 sm:px-5 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
				<Link className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline min-h-11 mb-4" to="/">
					← Inicio
				</Link>
				<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive m-0" role="alert">
					Las mascotas están disponibles para cuentas de dueño.
				</p>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full max-w-[1200px] px-4 sm:px-5 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
			<header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-7">
				<div className="min-w-0">
					<p className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70 mb-1.5">Mi cuenta</p>
					<h1 className="text-[clamp(1.4rem,2.5vw,2rem)] font-bold tracking-tight text-foreground leading-tight">Mis mascotas</h1>
					<p className="text-sm text-muted-foreground mt-1 mb-0">Registra fichas para agendar en veterinarias y llevar historial clínico.</p>
				</div>
				<Link
					className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-primary px-5 h-11 font-bold text-[0.95rem] text-primary-foreground no-underline whitespace-nowrap shadow-sm hover:bg-primary/90 transition-colors"
					to="/mascotas/nueva"
				>
					<Plus className="w-4 h-4" aria-hidden="true" />
					Registrar mascota
				</Link>
			</header>

			{error ? (
				<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive mb-5" role="alert" aria-live="assertive">
					{error}
				</p>
			) : null}

			{loading ? (
				<div className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6" role="status" aria-live="polite">
					<p className="text-muted-foreground m-0">Cargando mascotas…</p>
				</div>
			) : pets.length === 0 ? (
				<div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-12 text-center">
					<PawPrint className="w-10 h-10 text-muted-foreground/50" aria-hidden="true" />
					<div>
						<p className="font-semibold text-foreground mb-1">Aún no tienes mascotas registradas</p>
						<p className="text-sm text-muted-foreground m-0">Registra a tu compañero para llevar su historial clínico y agendar citas.</p>
					</div>
					<Link
						className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 h-10 font-bold text-sm text-primary-foreground no-underline hover:bg-primary/90 transition-colors mt-1"
						to="/mascotas/nueva"
					>
						<Plus className="w-4 h-4" aria-hidden="true" />
						Registrar primera mascota
					</Link>
				</div>
			) : (
				<ul className="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
					{pets.map((p) => {
						const id = String(p._id || p.id);
						const isDeceased = p.status === 'deceased';
						return (
							<li key={id} className="m-0 p-0">
								<article className="rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all overflow-hidden h-full flex flex-col">
									<div className="aspect-square overflow-hidden bg-muted">
										<PetPhoto petId={id} alt={p.name} className="w-full h-full object-cover" />
									</div>
									<div className="p-4 flex flex-col flex-1">
										<div className="flex items-start justify-between gap-2 mb-1">
											<h2 className="font-bold text-base text-foreground leading-snug">{p.name}</h2>
											<span
												className={cn(
													'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold shrink-0',
													isDeceased
														? 'bg-muted text-muted-foreground'
														: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
												)}
											>
												{isDeceased ? 'Fallecida' : 'Activa'}
											</span>
										</div>
										<p className="text-xs text-muted-foreground capitalize mb-3 mt-0">{p.species}</p>
										<div className="flex flex-wrap gap-1.5 mt-auto">
											<Link
												to={`/mascotas/${id}`}
												className="inline-flex h-8 items-center px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 no-underline transition-colors"
											>
												Ver ficha
											</Link>
											{!isDeceased && (
												<>
													<Link
														to={`/mascotas/${id}/edit`}
														className="inline-flex h-8 items-center px-3 rounded-lg border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted no-underline transition-colors"
													>
														Editar
													</Link>
													<Link
														to={`/mascotas/${id}/ficha`}
														className="inline-flex h-8 items-center px-3 rounded-lg border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted no-underline transition-colors"
													>
														Historial
													</Link>
												</>
											)}
										</div>
									</div>
								</article>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
