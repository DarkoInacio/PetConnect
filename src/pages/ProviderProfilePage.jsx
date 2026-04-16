import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { resolveBackendAssetUrl } from '../services/api';
import { fetchProviderPublicProfile } from '../services/providers';

const providerPinIcon = L.divIcon({
	className: 'provider-marker',
	html: '<div class="provider-marker-inner">📍</div>',
	iconSize: [34, 34],
	iconAnchor: [17, 34]
});

function formatProviderType(providerType) {
	if (!providerType) return 'Proveedor';
	return providerType.charAt(0).toUpperCase() + providerType.slice(1);
}

function formatReferenceRate(referenceRate) {
	if (!referenceRate || referenceRate.amount == null) return null;
	const currency = referenceRate.currency || 'CLP';
	const unit = referenceRate.unit ? `/${referenceRate.unit}` : '';
	return `Desde ${referenceRate.amount} ${currency}${unit}`;
}

export function ProviderProfilePage() {
	const { id } = useParams();
	const [provider, setProvider] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		const controller = new AbortController();

		async function loadProfile() {
			try {
				setLoading(true);
				setError('');
				const data = await fetchProviderPublicProfile(id, controller.signal);
				setProvider(data.proveedor || null);
			} catch (err) {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setError(err.response?.data?.message || 'No se pudo cargar el perfil del proveedor.');
			} finally {
				setLoading(false);
			}
		}

		loadProfile();
		return () => controller.abort();
	}, [id]);

	if (loading) {
		return (
			<div className='page profile-page'>
				<p>Cargando perfil...</p>
			</div>
		);
	}

	if (error || !provider) {
		return (
			<div className='page profile-page'>
				<Link className='back-link' to='/'>
					Volver al mapa
				</Link>
				<p className='error'>{error || 'Proveedor no encontrado.'}</p>
			</div>
		);
	}

	const perfil = provider.perfil || {};
	const address = perfil.address || {};
	const socialMedia = perfil.socialMedia || {};
	const gallery = Array.isArray(perfil.gallery) ? perfil.gallery.filter(Boolean) : [];
	const services = Array.isArray(perfil.services) ? perfil.services.filter(Boolean) : [];
	const rateLabel = formatReferenceRate(perfil.referenceRate);
	const operationalStatus = perfil.operationalStatus || 'abierto';
	const isTemporarilyClosed = operationalStatus === 'temporalmente_cerrado';
	const coordinates = address.coordinates || null;
	const hasCoordinates =
		coordinates &&
		coordinates.lat !== undefined &&
		coordinates.lng !== undefined &&
		!Number.isNaN(Number(coordinates.lat)) &&
		!Number.isNaN(Number(coordinates.lng));
	const mapsDirectionsUrl = hasCoordinates
		? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
				`${coordinates.lat},${coordinates.lng}`
		  )}`
		: null;

	return (
		<div className='page profile-page'>
			<Link className='back-link' to='/'>
				Volver al mapa
			</Link>

			<section className='profile-card'>
				<div className='profile-hero'>
					{provider.profileImage ? (
						<img
							className='profile-avatar'
							src={resolveBackendAssetUrl(provider.profileImage)}
							alt={`${provider.name} ${provider.lastName}`}
						/>
					) : (
						<div className='profile-avatar placeholder'>
							<span>{provider.name?.[0] || 'P'}</span>
						</div>
					)}

					<div>
						<h1>{`${provider.name || ''} ${provider.lastName || ''}`.trim()}</h1>
						<p className='profile-type'>{formatProviderType(provider.providerType)}</p>
						{isTemporarilyClosed ? (
							<p className='status-chip status-closed'>Temporalmente cerrado</p>
						) : (
							<p className='status-chip status-open'>Disponible para agendamiento</p>
						)}
						<p>{perfil.description || 'Este proveedor aún no ha agregado una descripción.'}</p>
					</div>
				</div>

				{gallery.length > 0 ? (
					<div className='profile-gallery'>
						{gallery.map((img, idx) => (
							<img key={`${img}-${idx}`} src={resolveBackendAssetUrl(img)} alt={`Foto ${idx + 1}`} />
						))}
					</div>
				) : null}

				<div className='profile-grid'>
					<div className='profile-section'>
						<h2>Ubicación</h2>
						<p>{[address.street, address.commune, address.city].filter(Boolean).join(', ') || 'Sin dirección informada.'}</p>
						{hasCoordinates ? (
							<div className='mini-map-wrap'>
								<MapContainer
									center={[Number(coordinates.lat), Number(coordinates.lng)]}
									zoom={15}
									scrollWheelZoom={false}
									style={{ height: '200px', width: '100%' }}
								>
									<TileLayer
										attribution='&copy; OpenStreetMap contributors'
										url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
									/>
									<Marker
										position={[Number(coordinates.lat), Number(coordinates.lng)]}
										icon={providerPinIcon}
									/>
								</MapContainer>
								<a href={mapsDirectionsUrl} target='_blank' rel='noreferrer'>
									Cómo llegar
								</a>
							</div>
						) : null}
					</div>

					<div className='profile-section'>
						<h2>Servicios</h2>
						{services.length > 0 ? (
							<ul className='services-list'>
								{services.map((service) => (
									<li key={service}>
										<span>{service}</span>
										{rateLabel ? <em>{rateLabel}</em> : null}
									</li>
								))}
							</ul>
						) : (
							<p>Sin servicios informados.</p>
						)}
					</div>

					<div className='profile-section'>
						<h2>Especialidades</h2>
						<p>
							{Array.isArray(perfil.specialties) && perfil.specialties.length > 0
								? perfil.specialties.join(', ')
								: 'Sin especialidades informadas.'}
						</p>
					</div>

					<div className='profile-section'>
						<h2>Contacto y redes</h2>
						<p>
							{provider.phone ? (
								<a className='phone-link' href={`tel:${provider.phone}`}>
									{provider.phone}
								</a>
							) : (
								'Sin teléfono informado.'
							)}
						</p>
						<p>{perfil.schedule || 'Sin horarios informados.'}</p>
						<div className='social-list'>
							{socialMedia.instagram ? <a href={socialMedia.instagram} target='_blank' rel='noreferrer'>Instagram</a> : null}
							{socialMedia.facebook ? <a href={socialMedia.facebook} target='_blank' rel='noreferrer'>Facebook</a> : null}
							{socialMedia.twitter ? <a href={socialMedia.twitter} target='_blank' rel='noreferrer'>Twitter</a> : null}
							{socialMedia.website ? <a href={socialMedia.website} target='_blank' rel='noreferrer'>Sitio web</a> : null}
							{!socialMedia.instagram && !socialMedia.facebook && !socialMedia.twitter && !socialMedia.website ? (
								<p>Sin redes sociales informadas.</p>
							) : null}
						</div>
					</div>
				</div>

				{!hasCoordinates ? (
					<p className='no-map-note'>
						Este perfil no tiene coordenadas precisas todavía, por lo que no se puede mostrar el mini mapa.
					</p>
				) : null}

				<div className='profile-cta-desktop'>
					<a
						className={`book-btn ${isTemporarilyClosed ? 'disabled' : ''}`}
						href={isTemporarilyClosed ? '#' : `/agendar?providerId=${provider.id}`}
						aria-disabled={isTemporarilyClosed}
						onClick={(e) => {
							if (isTemporarilyClosed) e.preventDefault();
						}}
					>
						Agendar cita
					</a>
					{isTemporarilyClosed ? (
						<p className='closed-note'>Este proveedor está temporalmente cerrado. No es posible agendar por ahora.</p>
					) : null}
				</div>
			</section>

			<div className='profile-cta-sticky-mobile'>
				<a
					className={`book-btn ${isTemporarilyClosed ? 'disabled' : ''}`}
					href={isTemporarilyClosed ? '#' : `/agendar?providerId=${provider.id}`}
					aria-disabled={isTemporarilyClosed}
					onClick={(e) => {
						if (isTemporarilyClosed) e.preventDefault();
					}}
				>
					Agendar cita
				</a>
			</div>
		</div>
	);
}
