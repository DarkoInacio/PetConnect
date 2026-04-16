import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { resolveBackendAssetUrl } from '../services/api';
import { fetchProviderPublicProfile } from '../services/providers';

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
						<p className='profile-type'>{provider.providerType || 'Proveedor'}</p>
						<p>{perfil.description || 'Este proveedor aún no ha agregado una descripción.'}</p>
					</div>
				</div>

				<div className='profile-grid'>
					<div className='profile-section'>
						<h2>Ubicación</h2>
						<p>{[address.street, address.commune, address.city].filter(Boolean).join(', ') || 'Sin dirección informada.'}</p>
					</div>

					<div className='profile-section'>
						<h2>Servicios</h2>
						<p>
							{Array.isArray(perfil.services) && perfil.services.length > 0
								? perfil.services.join(', ')
								: 'Sin servicios informados.'}
						</p>
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
			</section>
		</div>
	);
}
