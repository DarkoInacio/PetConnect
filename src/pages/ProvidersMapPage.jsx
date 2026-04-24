import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchProvidersMapData, getProviderProfilePath } from '../services/providers';
import { ProvidersMap } from '../components/ProvidersMap';

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
		<div className="page page--map">
			<div className="page-surface page-surface--map">
				<header className="page-hero page-hero--map">
					<h1>Clínicas veterinarias cerca de ti</h1>
					<p>
						{user
							? 'Usamos tu ubicación como referencia en el mapa para mostrar y ordenar clínicas cercanas, pensando en el cuidado de tu mascota.'
							: 'Encuentra atención profesional en el mapa. Con una cuenta puedes reservar y llevar la ficha de salud de tu mascota en un solo lugar.'}{' '}
						¿Buscas paseo o cuidado? <Link to="/explorar">Abrir Explorar</Link>.
					</p>
				</header>

				<section className="filters filters--map" aria-label="Filtros del mapa de clínicas">
					<div className="map-filter-static">
						<span className="map-filter-label">Solo clínicas veterinarias</span>
						<small className="muted" style={{ display: 'block' }}>
							Paseadores y cuidadores: Explorar.
						</small>
					</div>
					<input
						type="text"
						placeholder="Ej. consulta, vacunas"
						aria-label="Buscar por tipo de servicio"
						value={filters.servicio}
						onChange={(e) => setFilters((prev) => ({ ...prev, servicio: e.target.value }))}
					/>
					<input
						type="text"
						placeholder="Ciudad o comuna"
						aria-label="Filtrar por ciudad o comuna"
						value={filters.ciudad}
						onChange={(e) => setFilters((prev) => ({ ...prev, ciudad: e.target.value }))}
					/>
					<input
						type="number"
						min="1"
						max="100"
						aria-label="Radio de búsqueda en kilómetros"
						value={filters.radio}
						onChange={(e) => setFilters((prev) => ({ ...prev, radio: e.target.value }))}
					/>
				</section>

				{error ? (
					<p className="error" style={{ marginBottom: 0 }} role="alert" aria-live="assertive">
						{error}
					</p>
				) : null}
			</div>

			<div className="content">
				<div className="map-panel" role="region" aria-label="Mapa de clínicas veterinarias">
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

				<aside className="list-panel" aria-label="Listado de clínicas cerca de tu búsqueda">
					<div className="list-header">
						<strong>{loading ? 'Cargando clínicas…' : `${markers.length} clínicas encontradas`}</strong>
					</div>
					<ul>
						{markers.map((provider) => {
							const isSelected = String(provider.id) === String(selectedProviderId);
							return (
								<li key={provider.id} className={isSelected ? 'selected' : ''}>
									<button
										type="button"
										aria-pressed={isSelected}
										onClick={() => setSelectedProviderId(provider.id)}
									>
										<span>{provider.fullName || `${provider.name} ${provider.lastName}`}</span>
										<small>
											{provider.providerType} · {provider.isTemporarilyClosed ? 'Temporalmente cerrado' : 'Abierto'}
										</small>
									</button>
								</li>
							);
						})}
					</ul>
					{selectedProvider ? (
						<Link
							className="profile-link"
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
