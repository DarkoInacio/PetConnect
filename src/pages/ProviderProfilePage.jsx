import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { getStoredAuthToken, resolveBackendAssetUrl } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { OwnerAppointmentReviewPanel } from '../components/OwnerAppointmentReviewPanel';
import { ReviewReportModal } from '../components/ReviewReportModal';
import { fetchProviderPublicProfile, fetchProviderPublicProfileBySlug, fetchProviderReviews } from '../services/providers';

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
	const [searchParams, setSearchParams] = useSearchParams();
	const resenaCitaId = (searchParams.get('resenaCita') || searchParams.get('citaResena') || '').trim();
	const pestanaRaw = (searchParams.get('pestana') || 'perfil').toLowerCase();
	const activeTab = pestanaRaw === 'resenas' || pestanaRaw === 'reseñas' ? 'resenas' : 'perfil';
	const { user } = useAuth();
	const [provider, setProvider] = useState(null);
	const [profileReviewTick, setProfileReviewTick] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [orden, setOrden] = useState('reciente');
	const [reviewsState, setReviewsState] = useState({
		items: [],
		total: 0,
		pagina: 1,
		limite: 5,
		loading: false
	});
	const [reviewListMeta, setReviewListMeta] = useState({
		ratingSummary: null,
		basedOnLabel: null,
		empty: null,
		emptyHint: null
	});
	const [reportOpen, setReportOpen] = useState(false);
	const [reportReviewId, setReportReviewId] = useState(null);
	const [reportToast, setReportToast] = useState('');

	function setProfileTab(next) {
		const n = new URLSearchParams(searchParams);
		n.set('pestana', next);
		setSearchParams(n, { replace: true });
	}

	/** Con ?resenaCita= abrir pestaña Reseñas (se respeta pestana=perfil en la URL). */
	useEffect(() => {
		if (!resenaCitaId) return;
		const p = (searchParams.get('pestana') || '').toLowerCase();
		if (p === 'perfil') return;
		if (p === 'resenas' || p === 'reseñas') return;
		const n = new URLSearchParams(searchParams);
		n.set('pestana', 'resenas');
		setSearchParams(n, { replace: true });
	}, [resenaCitaId, searchParams, setSearchParams]);

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
			const fallbackFromProfile = (() => {
				const recent = provider?.reviewsRecent;
				if (!Array.isArray(recent) || recent.length === 0) return { items: [], total: 0, summary: null };
				return { items: recent, total: recent.length, summary: provider?.ratingSummary || null };
			})();

			try {
				const data = await fetchProviderReviews(
					provider.id,
					{ pagina: 1, limite: 5, orden },
					controller.signal
				);
				if (controller.signal.aborted) return;
				setReviewsState({
					items: Array.isArray(data.reviews) ? data.reviews : [],
					total: typeof data.total === 'number' ? data.total : 0,
					pagina: data.pagina || 1,
					limite: data.limite || 5,
					loading: false
				});
				setReviewListMeta({
					ratingSummary: data.ratingSummary || null,
					basedOnLabel: data.basedOnLabel || null,
					empty: data.empty,
					emptyHint: data.emptyHint || null
				});
			} catch {
				if (controller.signal.aborted) return;
				/* Misma carga pública: si falla el listado, usar preview del GET /perfil. */
				setReviewsState((s) => ({
					...s,
					loading: false,
					items: fallbackFromProfile.items.length > 0 ? fallbackFromProfile.items : s.items,
					total: fallbackFromProfile.total > 0 ? fallbackFromProfile.total : s.total
				}));
				if (fallbackFromProfile.summary) {
					setReviewListMeta((m) => ({
						...m,
						ratingSummary: m.ratingSummary || fallbackFromProfile.summary
					}));
				}
			}
		}
		loadReviews();
		return () => controller.abort();
	}, [provider, orden, profileReviewTick]);

	const loadMoreReviews = async () => {
		if (!provider?.id || reviewsState.loading) return;
		const nextPage = reviewsState.pagina + 1;
		if (reviewsState.items.length >= reviewsState.total) return;
		setReviewsState((s) => ({ ...s, loading: true }));
		try {
			const data = await fetchProviderReviews(provider.id, {
				pagina: nextPage,
				limite: reviewsState.limite,
				orden
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
	const summary = reviewListMeta.ratingSummary || ratingSummary;
	const isOwner = user?.role === 'dueno';

	function canReportReview(r) {
		if (!getStoredAuthToken() || !user) return false;
		const aid = r.author?.id;
		if (!aid) return true;
		return String(aid) !== String(user.id);
	}

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
						{summary?.count > 0 ? (
							<p className='profile-rating-line'>
								<strong>{summary.average != null ? summary.average.toFixed(1) : '—'}</strong>
								<span> / 5</span>
								<span className='profile-rating-count'> · {summary.count} reseña(s)</span>
							</p>
						) : (
							<p className='profile-rating-line muted'>Sin reseñas públicas todavía.</p>
						)}
						<p>{perfil.description || 'Aún no hay descripción pública en este perfil.'}</p>
					</div>
				</div>

				<div className='profile-tabs' role='tablist' aria-label='Contenido del perfil'>
					<button
						type='button'
						role='tab'
						className={activeTab === 'perfil' ? 'profile-tab profile-tab--active' : 'profile-tab'}
						aria-selected={activeTab === 'perfil'}
						onClick={() => setProfileTab('perfil')}
					>
						Perfil
					</button>
					<button
						type='button'
						role='tab'
						className={activeTab === 'resenas' ? 'profile-tab profile-tab--active' : 'profile-tab'}
						aria-selected={activeTab === 'resenas'}
						onClick={() => setProfileTab('resenas')}
					>
						Reseñas
					</button>
				</div>

				{activeTab === 'perfil' ? (
					<>
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
					</>
				) : null}

				{activeTab === 'resenas' ? (
					<>
				{resenaCitaId ? (
					<>
						<OwnerAppointmentReviewPanel
							appointmentId={resenaCitaId}
							providerName={`${provider.name || ''} ${provider.lastName || ''}`.trim()}
							onReviewSaved={() => setProfileReviewTick((t) => t + 1)}
						/>
						<p className='muted' style={{ margin: '0 0 0.5rem' }}>
							<button
								type='button'
								className='link-button'
								onClick={() => {
									const n = new URLSearchParams(searchParams);
									n.delete('resenaCita');
									n.delete('citaResena');
									setSearchParams(n, { replace: true });
								}}
							>
								Quitar enlace a esta cita
							</button>
						</p>
					</>
				) : null}

				<section className='profile-section reviews-section'>
					<h2>Reseñas</h2>
					{reviewListMeta.basedOnLabel ? (
						<p className='muted' style={{ marginTop: 0 }}>{reviewListMeta.basedOnLabel}</p>
					) : null}
					{summary?.distributionWithPercent && summary.count > 0 ? (
						<div className='review-distribution' aria-label='Distribución de estrellas'>
							{[5, 4, 3, 2, 1].map((s) => {
								const d = summary.distributionWithPercent[s] || { count: 0, percent: 0 };
								return (
									<div key={s} className='review-dist-row'>
										<span className='review-dist-label'>{s} ★</span>
										<div className='review-dist-bar-wrap'>
											<div
												className='review-dist-bar'
												style={{ width: `${Math.min(100, d.percent)}%` }}
											/>
										</div>
										<span className='review-dist-pct'>{d.percent}%</span>
									</div>
								);
							})}
						</div>
					) : null}
					<div className='review-toolbar'>
						<label className='review-order'>
							<span>Ordenar</span>
							<select value={orden} onChange={(e) => setOrden(e.target.value)}>
								<option value='reciente'>Más recientes</option>
								<option value='mayor'>Mejor puntuación</option>
								<option value='menor'>Menor puntuación</option>
							</select>
						</label>
					</div>
					{reportToast ? <p className='review-success'>{reportToast}</p> : null}
					{reviewsState.loading && reviewsState.items.length === 0 ? (
						<p>Cargando reseñas…</p>
					) : reviewsState.items.length === 0 ? (
						<p className='muted'>{reviewListMeta.emptyHint || 'Nadie ha publicado reseñas aún.'}</p>
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
										{getStoredAuthToken() && canReportReview(r) ? (
											<button
												type='button'
												className='link-button review-report-link'
												onClick={() => {
													setReportReviewId(String(r.id));
													setReportOpen(true);
												}}
											>
												Reportar
											</button>
										) : null}
									</div>
									{r.observation || r.comment ? (
										<p className='review-comment'>{r.observation || r.comment}</p>
									) : null}
									{r.providerResponse ? (
										<div className='provider-reply public'>
											<p className='provider-reply-label'>{r.providerResponse.label || 'Respuesta'}</p>
											<p className='review-comment' style={{ marginTop: '0.25rem' }}>
												{r.providerResponse.text}
											</p>
										</div>
									) : null}
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
					<p className='muted' style={{ marginTop: '1.25rem' }}>
						{isOwner ? (
							<>
								La valoración pública (estrellas y observación opcional) exige la cita en estado{' '}
								<strong>completada</strong>. Puedes publicarla o revisar el historial en{' '}
								<Link to='/cuenta/reservas'>Reservas</Link>.
							</>
						) : getStoredAuthToken() ? (
							<>
								Tras un servicio completado, el dueño podrá reseñar desde <Link to='/cuenta/reservas'>tu cuenta, reservas</Link>.
							</>
						) : (
							<>Solo el dueño, con cita finalizada, puede reseñar; hazlo desde Mis reservas.</>
						)}
					</p>
				</section>
				<ReviewReportModal
					open={reportOpen}
					reviewId={reportReviewId}
					onClose={() => {
						setReportOpen(false);
						setReportReviewId(null);
					}}
					onDone={(msg) => setReportToast(msg)}
				/>
					</>
				) : null}
			</section>

			{activeTab === 'perfil' ? (
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
			) : null}
		</div>
	);
}
