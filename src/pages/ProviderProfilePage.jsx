import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { getStoredAuthToken, resolveBackendAssetUrl } from '../services/api';
import {
	createProviderReview,
	fetchProviderPublicProfile,
	fetchProviderPublicProfileBySlug,
	fetchProviderReviews
} from '../services/providers';

const providerPinIcon = L.divIcon({
	className: 'provider-marker',
	html: '<div class="provider-marker-inner">📍</div>',
	iconSize: [34, 34],
	iconAnchor: [17, 34]
});

function formatProviderType(providerType) {
	if (!providerType) return 'Profesional';
	if (providerType === 'veterinaria') return 'Veterinaria';
	return providerType.charAt(0).toUpperCase() + providerType.slice(1);
}

function formatReferenceRate(referenceRate) {
	if (!referenceRate || referenceRate.amount == null) return null;
	const currency = referenceRate.currency || 'CLP';
	const unit = referenceRate.unit ? `/${referenceRate.unit}` : '';
	return `Desde ${referenceRate.amount} ${currency}${unit}`;
}

function ctaByProviderType(providerType) {
	if (providerType === 'paseador' || providerType === 'cuidador') {
		return {
			label: 'Solicitar servicio',
			hrefBase: '/solicitar-servicio'
		};
	}
	return {
		label: 'Agendar cita',
		hrefBase: '/agendar'
	};
}

function formatReviewDate(iso) {
	if (!iso) return '';
	try {
		return new Date(iso).toLocaleDateString('es-CL', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	} catch {
		return '';
	}
}

function Stars({ value }) {
	const n = Math.min(5, Math.max(0, Number(value) || 0));
	return <span className='review-stars'>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

export function ProviderProfilePage() {
	const { id, tipo, slug } = useParams();
	const isSlugRoute = Boolean(tipo && slug);
	const [provider, setProvider] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [reviewsState, setReviewsState] = useState({
		items: [],
		total: 0,
		pagina: 1,
		limite: 10,
		loading: false
	});
	const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
	const [reviewSubmitting, setReviewSubmitting] = useState(false);
	const [reviewError, setReviewError] = useState('');
	const [reviewSuccess, setReviewSuccess] = useState('');

	useEffect(() => {
		const controller = new AbortController();

		async function loadProfile() {
			try {
				setLoading(true);
				setError('');
				let data;
				if (isSlugRoute) {
					data = await fetchProviderPublicProfileBySlug(tipo, slug, controller.signal);
				} else if (id) {
					data = await fetchProviderPublicProfile(id, controller.signal);
				} else {
					setError('Ruta de perfil inválida.');
					setProvider(null);
					return;
				}
				setProvider(data.proveedor || null);
			} catch (err) {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setError(err.response?.data?.message || 'No se pudo cargar el perfil público.');
				setProvider(null);
			} finally {
				setLoading(false);
			}
		}

		loadProfile();
		return () => controller.abort();
	}, [id, tipo, slug, isSlugRoute]);

	useEffect(() => {
		if (!provider?.id) return;
		const controller = new AbortController();
		setReviewsState((s) => ({ ...s, loading: true }));

		async function loadReviews() {
			try {
				const data = await fetchProviderReviews(
					provider.id,
					{ pagina: 1, limite: 10 },
					controller.signal
				);
				if (controller.signal.aborted) return;
				setReviewsState({
					items: Array.isArray(data.reviews) ? data.reviews : [],
					total: typeof data.total === 'number' ? data.total : 0,
					pagina: data.pagina || 1,
					limite: data.limite || 10,
					loading: false
				});
			} catch {
				if (controller.signal.aborted) return;
				setReviewsState((s) => ({ ...s, loading: false }));
			}
		}
		loadReviews();
		return () => controller.abort();
	}, [provider?.id]);

	const loadMoreReviews = async () => {
		if (!provider?.id || reviewsState.loading) return;
		const nextPage = reviewsState.pagina + 1;
		if (reviewsState.items.length >= reviewsState.total) return;
		setReviewsState((s) => ({ ...s, loading: true }));
		try {
			const data = await fetchProviderReviews(provider.id, {
				pagina: nextPage,
				limite: reviewsState.limite
			});
			setReviewsState((s) => ({
				...s,
				items: [...s.items, ...(Array.isArray(data.reviews) ? data.reviews : [])],
				pagina: data.pagina || nextPage,
				total: typeof data.total === 'number' ? data.total : s.total,
				loading: false
			}));
		} catch {
			setReviewsState((s) => ({ ...s, loading: false }));
		}
	};

	const onSubmitReview = async (e) => {
		e.preventDefault();
		if (!provider?.id || !getStoredAuthToken()) return;
		setReviewSubmitting(true);
		setReviewError('');
		setReviewSuccess('');
		try {
			const data = await createProviderReview(provider.id, {
				rating: Number(reviewForm.rating),
				comment: reviewForm.comment
			});
			setReviewSuccess(data.message || 'Reseña publicada.');
			setReviewForm({ rating: 5, comment: '' });
			const rev = await fetchProviderReviews(provider.id, { pagina: 1, limite: 10 });
			setReviewsState({
				items: rev.reviews || [],
				total: rev.total || 0,
				pagina: 1,
				limite: rev.limite || 10,
				loading: false
			});
			setProvider((p) =>
				p
					? {
							...p,
							ratingSummary: data.ratingSummary ?? p.ratingSummary,
							reviewsRecent: data.reviewsRecent ?? p.reviewsRecent
						}
					: p
			);
		} catch (err) {
			setReviewError(err.response?.data?.message || 'No se pudo enviar la reseña.');
		} finally {
			setReviewSubmitting(false);
		}
	};

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
				<p className='error'>{error || 'Perfil no encontrado o aún no disponible (revisión o no publicado).'}</p>
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
	const cta = ctaByProviderType(provider.providerType);
	const ctaHref = `${cta.hrefBase}?providerId=${provider.id}`;
	const ratingSummary = provider.ratingSummary;

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
						{ratingSummary?.count > 0 ? (
							<p className='profile-rating-line'>
								<strong>{ratingSummary.average != null ? ratingSummary.average.toFixed(1) : '—'}</strong>
								<span> / 5</span>
								<span className='profile-rating-count'> · {ratingSummary.count} reseña(s)</span>
							</p>
						) : (
							<p className='profile-rating-line muted'>Sin reseñas públicas todavía.</p>
						)}
						<p>{perfil.description || 'Aún no hay descripción pública en este perfil.'}</p>
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

				<section className='profile-section reviews-section'>
					<h2>Reseñas</h2>
					{reviewsState.loading && reviewsState.items.length === 0 ? (
						<p>Cargando reseñas…</p>
					) : reviewsState.items.length === 0 ? (
						<p className='muted'>Nadie ha publicado reseñas aún.</p>
					) : (
						<ul className='review-list'>
							{reviewsState.items.map((r) => (
								<li key={String(r.id)} className='review-item'>
									<div className='review-meta'>
										<Stars value={r.rating} />
										<span className='review-author'>
											{r.author
												? `${r.author.name || ''} ${r.author.lastName || ''}`.trim() || 'Dueño'
												: 'Usuario'}
										</span>
										<span className='review-date'>{formatReviewDate(r.createdAt)}</span>
									</div>
									{r.comment ? <p className='review-comment'>{r.comment}</p> : null}
								</li>
							))}
						</ul>
					)}
					{reviewsState.items.length < reviewsState.total ? (
						<button
							type='button'
							className='load-more-reviews'
							onClick={loadMoreReviews}
							disabled={reviewsState.loading}
						>
							{reviewsState.loading ? 'Cargando…' : 'Cargar más reseñas'}
						</button>
					) : null}

					<h3 className='review-form-title'>Dejar una reseña</h3>
					{getStoredAuthToken() ? (
						<form className='review-form' onSubmit={onSubmitReview}>
							<label className='review-field'>
								<span>Calificación</span>
								<select
									value={reviewForm.rating}
									onChange={(e) =>
										setReviewForm((f) => ({ ...f, rating: Number(e.target.value) }))
									}
								>
									{[5, 4, 3, 2, 1].map((n) => (
										<option key={n} value={n}>
											{n} estrellas
										</option>
									))}
								</select>
							</label>
							<label className='review-field'>
								<span>Comentario (opcional)</span>
								<textarea
									value={reviewForm.comment}
									onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
									rows={3}
									maxLength={2000}
									placeholder='Cuéntanos tu experiencia'
								/>
							</label>
							<button type='submit' className='review-submit' disabled={reviewSubmitting}>
								{reviewSubmitting ? 'Enviando…' : 'Publicar reseña'}
							</button>
							{reviewError ? <p className='error review-msg'>{reviewError}</p> : null}
							{reviewSuccess ? <p className='review-success'>{reviewSuccess}</p> : null}
						</form>
					) : (
						<p className='muted'>
							Para publicar una reseña necesitas iniciar sesión como dueño. Con el login integrado, el token
							se enviará automáticamente; mientras tanto puedes guardar el JWT en{' '}
							<code>localStorage</code> bajo la clave configurada (por defecto{' '}
							<code>petconnect_token</code>).
						</p>
					)}
				</section>

				{!hasCoordinates ? (
					<p className='no-map-note'>
						Este perfil no tiene coordenadas precisas todavía, por lo que no se puede mostrar el mini mapa.
					</p>
				) : null}

				<div className='profile-cta-desktop'>
					<a
						className={`book-btn ${isTemporarilyClosed ? 'disabled' : ''}`}
						href={isTemporarilyClosed ? '#' : ctaHref}
						aria-disabled={isTemporarilyClosed}
						onClick={(e) => {
							if (isTemporarilyClosed) e.preventDefault();
						}}
					>
						{cta.label}
					</a>
					{isTemporarilyClosed ? (
						<p className='closed-note'>Este proveedor está temporalmente cerrado. No es posible agendar por ahora.</p>
					) : null}
				</div>
			</section>

			<div className='profile-cta-sticky-mobile'>
				<a
					className={`book-btn ${isTemporarilyClosed ? 'disabled' : ''}`}
					href={isTemporarilyClosed ? '#' : ctaHref}
					aria-disabled={isTemporarilyClosed}
					onClick={(e) => {
						if (isTemporarilyClosed) e.preventDefault();
					}}
				>
					{cta.label}
				</a>
			</div>
		</div>
	);
}
