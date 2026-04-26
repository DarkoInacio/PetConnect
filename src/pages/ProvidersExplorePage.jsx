import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getProviderProfilePath, searchProviders } from '../services/providers';
import { resolveBackendAssetUrl } from '../services/api';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Stethoscope, Dog, Home, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const TIPO_OPTIONS = [
	{ value: '', label: 'Cualquier tipo' },
	{ value: 'veterinaria', label: 'Veterinaria' },
	{ value: 'paseador', label: 'Paseador' },
	{ value: 'cuidador', label: 'Cuidador' },
];

function providerTypeIcon(type) {
	if (type === 'veterinaria') return Stethoscope;
	if (type === 'paseador') return Dog;
	return Home;
}

function providerTypeLabel(type) {
	if (type === 'veterinaria') return 'Veterinaria';
	if (type === 'paseador') return 'Paseador';
	if (type === 'cuidador') return 'Cuidador';
	return type || '—';
}

function providerTypeBadgeClass(type) {
	if (type === 'veterinaria')
		return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300';
	if (type === 'paseador') return 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300';
	return 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300';
}

export function ProvidersExplorePage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const [tipo, setTipo] = useState('');
	const [ciudad, setCiudad] = useState('');
	const [servicio, setServicio] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [resultados, setResultados] = useState(null);
	const [total, setTotal] = useState(0);
	const [geoErr, setGeoErr] = useState('');

	useEffect(() => {
		// Preselección desde query (?tipo=...)
		const t = searchParams.get('tipo');
		if (t && !tipo) {
			if (['veterinaria', 'paseador', 'cuidador'].includes(String(t))) {
				setTipo(String(t));
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		// Atajo desde Vetto: /explorar?urgencia=1
		if (searchParams.get('urgencia') !== '1') return;
		setTipo('veterinaria');
		setGeoErr('');
		if (!navigator.geolocation) {
			setGeoErr('Tu navegador no soporta geolocalización. Puedes buscar por ciudad.');
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				const lat = String(pos.coords.latitude);
				const lng = String(pos.coords.longitude);
				// Radio inicial razonable para urgencia.
				const radio = '12';
				const next = new URLSearchParams(searchParams);
				next.set('lat', lat);
				next.set('lng', lng);
				next.set('radio', radio);
				next.set('open24', '1');
				setSearchParams(next, { replace: true });
			},
			() => {
				setGeoErr('No pudimos obtener tu ubicación. Permite el acceso o busca por ciudad.');
			},
			{ enableHighAccuracy: false, timeout: 7000, maximumAge: 60_000 }
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const buscar = useCallback(async () => {
		setLoading(true);
		setError('');
		try {
			const params = { pagina: 1, limite: 30 };
			if (tipo.trim()) params.tipo = tipo.trim();
			if (ciudad.trim()) params.ciudad = ciudad.trim();
			if (servicio.trim()) params.servicio = servicio.trim();
			// Filtros por URL (urgencia / geo / 24/7)
			if (searchParams.get('open24') === '1') params.open24 = '1';
			if (searchParams.get('lat') && searchParams.get('lng') && searchParams.get('radio')) {
				params.lat = searchParams.get('lat');
				params.lng = searchParams.get('lng');
				params.radio = searchParams.get('radio');
			}
			// Para urgencia: priorizamos clínicas abiertas
			if (searchParams.get('urgencia') === '1') params.estadoOperacion = 'abierto';
			const data = await searchProviders(params);
			setResultados(Array.isArray(data.resultados) ? data.resultados : []);
			setTotal(data.total ?? 0);
		} catch (err) {
			setError(err.response?.data?.message || 'Error en la búsqueda.');
			setResultados([]);
		} finally {
			setLoading(false);
		}
	}, [tipo, ciudad, servicio, searchParams]);

	useEffect(() => {
		// Auto-buscar cuando vienen los params de urgencia.
		if (searchParams.get('urgencia') === '1' && searchParams.get('open24') === '1') {
			void buscar();
		}
	}, [buscar, searchParams]);

	function handleKeyDown(e) {
		if (e.key === 'Enter') void buscar();
	}

	return (
		<div className="mx-auto w-full max-w-[1200px] px-4 sm:px-5 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
			<Link
				className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline min-h-11 mb-4"
				to="/"
			>
				← Volver al mapa
			</Link>

			{/* Header */}
			<header className="mb-7">
				<p className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70 mb-1.5">
					Directorio
				</p>
				<h1 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold tracking-tight text-foreground leading-tight mb-2">
					Explorar clínicas, paseo y cuidado
				</h1>
				<p className="text-sm text-muted-foreground max-w-[52ch]">
					Encuentra veterinarias, paseadores o cuidadores según lo que necesite tu mascota.
				</p>
			</header>

			{/* Search card */}
			<div className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6 mb-6">
				<div
					className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4"
					role="search"
					aria-label="Búsqueda de proveedores"
				>
					{/* Tipo */}
					<div className="flex flex-col gap-1.5">
						<label htmlFor="tipo-filter" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
							Tipo de proveedor
						</label>
						<select
							id="tipo-filter"
							value={tipo}
							onChange={(e) => setTipo(e.target.value)}
							className="h-11 rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
						>
							{TIPO_OPTIONS.map((o) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
					</div>

					{/* Ciudad */}
					<div className="flex flex-col gap-1.5">
						<label htmlFor="ciudad-filter" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
							Ciudad o comuna
						</label>
						<div className="relative">
							<MapPin
								size={15}
								className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
								aria-hidden
							/>
							<input
								id="ciudad-filter"
								value={ciudad}
								onChange={(e) => setCiudad(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="Ej. Santiago"
								className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
							/>
						</div>
					</div>

					{/* Servicio */}
					<div className="flex flex-col gap-1.5">
						<label htmlFor="servicio-filter" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
							Servicio o especialidad
						</label>
						<div className="relative">
							<Search
								size={15}
								className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
								aria-hidden
							/>
							<input
								id="servicio-filter"
								value={servicio}
								onChange={(e) => setServicio(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="Texto libre…"
								className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
							/>
						</div>
					</div>
				</div>

				<Button
					type="button"
					disabled={loading}
					onClick={buscar}
					className="h-11 px-8 font-bold gap-2"
				>
					<Search size={15} aria-hidden />
					{loading ? 'Buscando…' : 'Buscar'}
				</Button>
			</div>

			{/* Error */}
			{error ? (
				<p
					className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive mb-4"
					role="alert"
					aria-live="assertive"
				>
					{error}
				</p>
			) : null}
			{geoErr && !error ? (
				<p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-3 text-sm text-amber-900 dark:text-amber-200 mb-4">
					{geoErr}
				</p>
			) : null}

			{/* Results header */}
			{resultados !== null && !error ? (
				<div className="flex items-center justify-between mb-4">
					<p className="text-sm text-muted-foreground" aria-live="polite">
						<span className="text-base font-bold text-foreground">{total}</span>{' '}
						{total === 1 ? 'resultado' : 'resultados encontrados'}
						{loading ? <span className="ml-2 text-primary animate-pulse">· Actualizando…</span> : null}
					</p>
				</div>
			) : null}

			{/* Empty state */}
			{resultados !== null && !loading && resultados.length === 0 && !error ? (
				<div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 dark:bg-muted/5 p-12 text-center">
					<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
						<Search size={20} className="text-muted-foreground" aria-hidden />
					</div>
					<p className="font-semibold text-foreground">Sin resultados</p>
					<p className="text-sm text-muted-foreground max-w-xs">
						Intenta con otros filtros o una ciudad diferente.
					</p>
				</div>
			) : null}

			{/* Results grid */}
			{resultados !== null && resultados.length > 0 ? (
				<ul
					className="list-none p-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
					aria-label="Listado de proveedores"
				>
					{resultados.map((p) => {
						const href = getProviderProfilePath({
							id: String(p.id),
							providerType: p.providerType,
							publicSlug: p.providerProfile?.publicSlug,
						});
						const img = p.profileImage ? resolveBackendAssetUrl(p.profileImage) : null;
						const TypeIcon = providerTypeIcon(p.providerType);
						return (
							<li key={String(p.id)}>
								<article className="h-full rounded-2xl border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/30 transition-all overflow-hidden">
									{/* Photo or placeholder */}
									<div className="h-32 bg-gradient-to-br from-muted/60 to-muted/30 dark:from-muted/40 dark:to-muted/10 flex items-center justify-center overflow-hidden">
										{img ? (
											<img
												src={img}
												alt=""
												className="w-full h-full object-cover"
											/>
										) : (
											<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center" aria-hidden>
												<TypeIcon size={28} className="text-primary/60" />
											</div>
										)}
									</div>

									<div className="p-4">
										{/* Badge */}
										<span
											className={cn(
												'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.68rem] font-bold mb-2',
												providerTypeBadgeClass(p.providerType)
											)}
										>
											<TypeIcon size={10} aria-hidden />
											{providerTypeLabel(p.providerType)}
										</span>

										{/* Name */}
										<h2 className="font-bold text-foreground text-base leading-tight mb-1">
											{p.name} {p.lastName}
										</h2>

										{/* Location if available */}
										{p.providerProfile?.city ? (
											<p className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
												<MapPin size={11} aria-hidden />
												{p.providerProfile.city}
											</p>
										) : null}

										{/* CTA */}
										<Link
											to={href}
											className="inline-flex items-center gap-1 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 no-underline transition-colors"
										>
											Ver perfil <ChevronRight size={13} aria-hidden />
										</Link>
									</div>
								</article>
							</li>
						);
					})}
				</ul>
			) : null}

			{/* Initial state (before searching) */}
			{resultados === null && !loading && !error ? (
				<div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/10 p-12 text-center">
					<div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
						<Search size={24} className="text-primary" aria-hidden />
					</div>
					<p className="font-semibold text-foreground">Usa los filtros para buscar</p>
					<p className="text-sm text-muted-foreground max-w-sm">
						Elige tipo, ciudad o escribe un servicio y pulsa <strong>Buscar</strong>.
					</p>
				</div>
			) : null}
		</div>
	);
}
