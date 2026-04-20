import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchProvidersMapData, getProviderProfilePath } from '../services/providers';
import { ProvidersMap } from '../components/ProvidersMap';

const DEFAULT_CENTER = { lat: -33.4489, lng: -70.6693 };

export function ProvidersMapPage() {
	const [markers, setMarkers] = useState([]);
	const [center, setCenter] = useState(DEFAULT_CENTER);
	const [selectedProviderId, setSelectedProviderId] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const [filters, setFilters] = useState({
		tipo: '',
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
					tipo: filters.tipo || undefined,
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
		<div className='page'>
			<header className='header'>
				<h1>PetConnect - Mapa de proveedores</h1>
				<p>
					Encuentra servicios cercanos y revisa su perfil rápidamente. También puedes{' '}
					<Link to='/explorar'>explorar con filtros (lista)</Link>.
				</p>
			</header>

			<section className='filters'>
				<select
					value={filters.tipo}
					onChange={(e) => setFilters((prev) => ({ ...prev, tipo: e.target.value }))}
				>
					<option value=''>Todos los tipos</option>
					<option value='veterinaria'>Veterinaria</option>
					<option value='paseador'>Paseador</option>
					<option value='cuidador'>Cuidador</option>
				</select>
				<input
					type='text'
					placeholder='Servicio'
					value={filters.servicio}
					onChange={(e) => setFilters((prev) => ({ ...prev, servicio: e.target.value }))}
				/>
				<input
					type='text'
					placeholder='Ciudad'
					value={filters.ciudad}
					onChange={(e) => setFilters((prev) => ({ ...prev, ciudad: e.target.value }))}
				/>
				<input
					type='number'
					min='1'
					max='100'
					value={filters.radio}
					onChange={(e) => setFilters((prev) => ({ ...prev, radio: e.target.value }))}
				/>
			</section>

			{error ? <p className='error'>{error}</p> : null}

			<div className='content'>
				<div className='map-panel'>
					<ProvidersMap
						center={center}
						markers={markers}
						selectedProviderId={selectedProviderId}
						onSelectProvider={setSelectedProviderId}
					/>
				</div>

				<aside className='list-panel'>
					<div className='list-header'>
						<strong>{loading ? 'Cargando...' : `${markers.length} resultados`}</strong>
					</div>
					<ul>
						{markers.map((provider) => {
							const isSelected = String(provider.id) === String(selectedProviderId);
							return (
								<li key={provider.id} className={isSelected ? 'selected' : ''}>
									<button type='button' onClick={() => setSelectedProviderId(provider.id)}>
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
						<Link className='profile-link' to={getProviderProfilePath(selectedProvider)}>
							Ver perfil seleccionado
						</Link>
					) : null}
				</aside>
			</div>
		</div>
	);
}
