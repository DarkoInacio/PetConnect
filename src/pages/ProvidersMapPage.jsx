import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchProvidersMapData, getProviderProfilePath } from '../services/providers';
import { ProvidersMap } from '../components/ProvidersMap';
import { cn } from '@/lib/utils';

const DEFAULT_CENTER = { lat: -33.4489, lng: -70.6693 };

export function ProvidersMapPage() {
	const { user } = useAuth();
	const [markers, setMarkers] = useState([]);
	const [center, setCenter] = useState(DEFAULT_CENTER);
	const [selectedProviderId, setSelectedProviderId] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const [filters, setFilters] = useState({
		servicio: '',
		ciudad: '',
		radio: 10
	});

	const [geo, setGeo] = useState({
		ready: false,
		lat: null,
		lng: null
	});

	useEffect(() => {
		if (!navigator.geolocation) {
			setGeo({ ready: true, lat: null, lng: null });
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				setGeo({
					ready: true,
					lat: position.coords.latitude,
					lng: position.coords.longitude
				});
			},
			() => {
				setGeo({ ready: true, lat: null, lng: null });
			},
			{ enableHighAccuracy: true, timeout: 10000 }
		);
	}, []);

	useEffect(() => {
		if (!geo.ready) return;

		const controller = new AbortController();
		setLoading(true);
		setError('');

		const timeoutId = setTimeout(async () => {
			try {
				const params = {
					tipo: 'veterinaria',
					servicio: filters.servicio || undefined,
					ciudad: filters.ciudad || undefined,
					radio: Number(filters.radio) || 10
				};
				if (geo.lat != null && geo.lng != null) {
					params.lat = geo.lat;
					params.lng = geo.lng;
				}

				const data = await fetchProvidersMapData(params, controller.signal);
				setMarkers(Array.isArray(data.markers) ? data.markers : []);
				if (data.center?.lat != null && data.center?.lng != null) {
					setCenter({ lat: data.center.lat, lng: data.center.lng });
				}
			} catch (err) {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setError(err.response?.data?.message || 'No se pudieron cargar los proveedores.');
				setMarkers([]);
			} finally {
				setLoading(false);
			}
		}, 350);

		return () => {
			clearTimeout(timeoutId);
			controller.abort();
		};
	}, [geo, filters]);

	const selectedProvider = useMemo(
		() => markers.find((m) => String(m.id) === String(selectedProviderId)) || null,
		[markers, selectedProviderId]
	);

	return (
		<div className="mx-auto w-full max-w-[1200px] px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
			<div className="max-w-full mx-auto w-full rounded-xl border border-border bg-card shadow-md px-4 py-5 sm:px-6 mb-3.5">
				<header className="mb-4">
					<h1 className="text-[clamp(1.4rem,2.4vw,1.75rem)] font-bold tracking-[-0.03em] text-foreground mb-1.5">
						Clínicas veterinarias cerca de ti
					</h1>
					<p className="text-muted-foreground max-w-[52ch] text-[0.98rem] m-0">
						{user
							? 'Usamos tu ubicación como referencia en el mapa para mostrar y ordenar clínicas cercanas, pensando en el cuidado de tu mascota.'
							: 'Encuentra atención profesional en el mapa. Con una cuenta puedes reservar y llevar la ficha de salud de tu mascota en un solo lugar.'}{' '}
						¿Buscas paseo o cuidado? <Link to="/explorar">Abrir Explorar</Link>.
					</p>
				</header>

				<section
					className="grid grid-cols-4 gap-2 mb-3 max-lg:grid-cols-2 max-sm:grid-cols-1"
					aria-label="Filtros del mapa de clínicas"
				>
					<div className="rounded-xl border border-border bg-[color-mix(in_srgb,var(--app-primary)_6%,#fff)] dark:bg-card px-3.5 py-2.5">
						<span className="font-semibold text-[hsl(222_47%_12%)] dark:text-foreground tracking-[0.01em]">
							Solo clínicas veterinarias
						</span>
						<small className="text-muted-foreground block">
							Paseadores y cuidadores: Explorar.
						</small>
					</div>
					<input
						type="text"
						placeholder="Ej. consulta, vacunas"
						aria-label="Buscar por tipo de servicio"
						value={filters.servicio}
						onChange={(e) => setFilters((prev) => ({ ...prev, servicio: e.target.value }))}
						className="min-h-11 rounded-[10px] border border-border bg-white dark:bg-card px-3 py-2.5 font-[inherit] leading-snug md:min-h-10"
					/>
					<input
						type="text"
						placeholder="Ciudad o comuna"
						aria-label="Filtrar por ciudad o comuna"
						value={filters.ciudad}
						onChange={(e) => setFilters((prev) => ({ ...prev, ciudad: e.target.value }))}
						className="min-h-11 rounded-[10px] border border-border bg-white dark:bg-card px-3 py-2.5 font-[inherit] leading-snug md:min-h-10"
					/>
					<input
						type="number"
						min="1"
						max="100"
						aria-label="Radio de búsqueda en kilómetros"
						value={filters.radio}
						onChange={(e) => setFilters((prev) => ({ ...prev, radio: e.target.value }))}
						className="min-h-11 rounded-[10px] border border-border bg-white dark:bg-card px-3 py-2.5 font-[inherit] leading-snug md:min-h-10"
					/>
				</section>

				{error ? (
					<p
						className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive mb-0"
						role="alert"
						aria-live="assertive"
					>
						{error}
					</p>
				) : null}
			</div>

			<div className="grid grid-cols-[2fr_1fr] gap-3.5 h-[calc(100dvh-8.5rem)] min-h-[520px] max-[900px]:grid-cols-1 max-[900px]:h-auto max-[560px]:min-h-[420px]">
			<div
				className="isolate rounded-[0.9rem] overflow-hidden border border-border shadow-sm max-[900px]:h-[420px] max-[560px]:min-h-[52vh]"
				role="region"
				aria-label="Mapa de clínicas veterinarias"
			>
					<ProvidersMap
						center={center}
						markers={markers}
						userPosition={
							geo.ready && geo.lat != null && geo.lng != null
								? { lat: geo.lat, lng: geo.lng }
								: null
						}
						selectedProviderId={selectedProviderId}
						onSelectProvider={setSelectedProviderId}
					/>
				</div>

				<aside
					className="bg-card border border-border rounded-[0.9rem] overflow-hidden flex flex-col shadow-sm max-[560px]:min-h-[240px]"
					aria-label="Listado de clínicas cerca de tu búsqueda"
				>
					<div className="px-3 py-3 border-b border-[#e7ecf2] dark:border-border">
						<strong>{loading ? 'Cargando clínicas…' : `${markers.length} clínicas encontradas`}</strong>
					</div>
					<ul className="m-0 p-0 list-none overflow-auto">
						{markers.map((provider) => {
							const isSelected = String(provider.id) === String(selectedProviderId);
							return (
								<li
									key={provider.id}
									className={cn(
										'border-b border-[#eef2f7] dark:border-border',
										isSelected && 'bg-primary/[0.09]'
									)}
								>
									<button
										type="button"
										aria-pressed={isSelected}
										onClick={() => setSelectedProviderId(provider.id)}
										className="border-0 bg-transparent w-full text-left px-3.5 py-3.5 min-h-11 cursor-pointer flex flex-col gap-1 justify-center focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2"
									>
										<span>{provider.fullName || `${provider.name} ${provider.lastName}`}</span>
										<small className="text-muted-foreground">
											{provider.providerType} · {provider.isTemporarilyClosed ? 'Temporalmente cerrado' : 'Abierto'}
										</small>
									</button>
								</li>
							);
						})}
					</ul>
					{selectedProvider ? (
						<Link
							className="flex items-center justify-center min-h-11 px-4 py-3 no-underline bg-primary text-primary-foreground text-center font-semibold transition-colors hover:bg-primary/90"
							to={getProviderProfilePath(selectedProvider)}
						>
							Ver ficha y agendar
						</Link>
					) : null}
				</aside>
			</div>
		</div>
	);
}
