import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { getStoredAuthToken, resolveBackendAssetUrl } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../lib/userRoles';
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
	return (
		<span className='text-amber-500 tracking-wide text-[0.95rem]'>
			{'★'.repeat(n)}{'☆'.repeat(5 - n)}
		</span>
	);
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
		const pid = String(provider?.id ?? provider?._id ?? '');
		if (!pid) return;
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
					pid,
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
		const pid = String(provider?.id ?? provider?._id ?? '');
		if (!pid || reviewsState.loading) return;
		const nextPage = reviewsState.pagina + 1;
		if (reviewsState.items.length >= reviewsState.total) return;
		setReviewsState((s) => ({ ...s, loading: true }));
		try {
			const data = await fetchProviderReviews(pid, {
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
			<div className='mx-auto w-full max-w-[1200px] px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]'>
				<p>Cargando perfil...</p>
			</div>
		);
	}

	if (error || !provider) {
		return (
			<div className='mx-auto w-full max-w-[1200px] px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]'>
				<Link
					className='inline-flex items-center gap-0.5 min-h-11 mb-2 px-0.5 py-0.5 text-primary font-semibold rounded-sm hover:text-primary/80 hover:underline'
					to='/'
				>
					Volver al mapa
				</Link>
				<p className='rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive mb-3'>
					{error || 'Perfil no encontrado o aún no disponible (revisión o no publicado).'}
				</p>
			</div>
		);
	}

	const perfil = provider.perfil || {};
	const address = perfil.address || {};
	const socialMedia = perfil.socialMedia || {};
	const gallery = Array.isArray(perfil.gallery) ? perfil.gallery.filter(Boolean) : [];
	const services = Array.isArray(perfil.services) ? perfil.services.filter(Boolean) : [];
	const clinicServices = Array.isArray(provider.clinicServices) ? provider.clinicServices : [];
	const isWalkerCare = provider.providerType === 'paseador' || provider.providerType === 'cuidador';
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
	const providerIdStr = String(provider.id ?? provider._id ?? '');
	const ctaHref = `${cta.hrefBase}?providerId=${encodeURIComponent(providerIdStr)}`;
	const ratingSummary = provider.ratingSummary;
	const summary = reviewListMeta.ratingSummary || ratingSummary;
	const isOwner = hasRole(user, 'dueno');

	function canReportReview(r) {
		if (!getStoredAuthToken() || !user) return false;
		const aid = r.author?.id;
		if (!aid) return true;
		return String(aid) !== String(user.id);
	}

	return (
		<div className='mx-auto w-full max-w-[1200px] px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))]'>
			<Link
				className='inline-flex items-center gap-0.5 min-h-11 mb-3 px-0.5 py-0.5 text-primary font-semibold rounded-sm hover:text-primary/80 hover:underline'
				to='/'
			>
				← Volver al mapa
			</Link>

			<section className='rounded-2xl border border-border bg-card shadow-sm dark:bg-card overflow-hidden'>
				{/* Hero section */}
				<div className='flex flex-col sm:flex-row gap-5 items-start p-5 sm:p-6 pb-4 sm:pb-5'>
					{provider.profileImage ? (
						<img
							className='w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] rounded-2xl object-cover bg-muted shrink-0 border border-border/50 shadow-sm'
							src={resolveBackendAssetUrl(provider.profileImage)}
							alt={`${provider.name} ${provider.lastName}`}
						/>
					) : (
						<div className='w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-5xl font-bold text-primary/60 shrink-0'>
							<span>{provider.name?.[0] || 'P'}</span>
						</div>
					)}

					<div className='flex-1 min-w-0'>
						<p className='text-[0.7rem] font-bold uppercase tracking-widest text-primary/70 mb-1'>
							{formatProviderType(provider.providerType)}
						</p>
						<h1 className='text-[clamp(1.4rem,2.4vw,1.75rem)] font-bold tracking-tight text-foreground mb-2'>
							{`${provider.name || ''} ${provider.lastName || ''}`.trim()}
						</h1>
						<div className='flex flex-wrap items-center gap-2 mb-3'>
							{isTemporarilyClosed ? (
								<span className='inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800'>
									Temporalmente cerrado
								</span>
							) : (
								<span className='inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'>
									Disponible
								</span>
							)}
							{summary?.count > 0 ? (
								<span className='inline-flex items-center gap-1.5 text-[0.9rem] text-foreground font-semibold'>
									<span className='text-amber-500 text-[0.95rem]'>★</span>
									<strong>{summary.average != null ? summary.average.toFixed(1) : '—'}</strong>
									<span className='text-muted-foreground font-normal text-sm'>({summary.count} reseña{summary.count !== 1 ? 's' : ''})</span>
								</span>
							) : (
								<span className='text-sm text-muted-foreground'>Sin reseñas todavía</span>
							)}
							{rateLabel ? (
								<span className='inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-semibold text-foreground'>
									{rateLabel}
								</span>
							) : null}
						</div>
						{perfil.description ? (
							<p className='text-[0.93rem] text-foreground/80 leading-relaxed max-w-[55ch]'>{perfil.description}</p>
						) : null}
					</div>

					{activeTab === 'perfil' ? (
						<a
							className={`hidden md:inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 font-bold text-primary-foreground no-underline hover:bg-primary/90 transition-colors shrink-0${isTemporarilyClosed ? ' opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
							href={isTemporarilyClosed ? '#' : ctaHref}
							aria-disabled={isTemporarilyClosed}
							onClick={(e) => { if (isTemporarilyClosed) e.preventDefault(); }}
						>
							{cta.label}
						</a>
					) : null}
				</div>

				{/* Tabs */}
				<div className='px-5 sm:px-6 pb-0'>
					<div className='flex flex-wrap gap-1.5 p-1.5 rounded-xl border border-border bg-muted/40 dark:bg-muted w-fit' role='tablist' aria-label='Contenido del perfil'>
						<button
							type='button'
							role='tab'
							className={activeTab === 'perfil'
								? 'rounded-lg border border-primary/30 bg-white dark:bg-card text-primary shadow-sm font-semibold px-4 py-1.5 text-sm cursor-pointer transition-colors'
								: 'rounded-lg border border-transparent bg-transparent text-muted-foreground hover:bg-white dark:hover:bg-card hover:text-foreground px-4 py-1.5 text-sm cursor-pointer transition-colors font-medium'}
							aria-selected={activeTab === 'perfil'}
							onClick={() => setProfileTab('perfil')}
						>
							Perfil
						</button>
						<button
							type='button'
							role='tab'
							className={activeTab === 'resenas'
								? 'rounded-lg border border-primary/30 bg-white dark:bg-card text-primary shadow-sm font-semibold px-4 py-1.5 text-sm cursor-pointer transition-colors'
								: 'rounded-lg border border-transparent bg-transparent text-muted-foreground hover:bg-white dark:hover:bg-card hover:text-foreground px-4 py-1.5 text-sm cursor-pointer transition-colors font-medium'}
							aria-selected={activeTab === 'resenas'}
							onClick={() => setProfileTab('resenas')}
						>
							Reseñas{summary?.count > 0 ? ` (${summary.count})` : ''}
						</button>
					</div>
				</div>
				<div className='border-t border-border mt-4'></div>

			{activeTab === 'perfil' ? (
				<div className='p-5 sm:p-6 flex flex-col gap-5'>
					{gallery.length > 0 ? (
						<div className='grid grid-cols-3 gap-2'>
							{gallery.map((img, idx) => (
								<img key={`${img}-${idx}`} src={resolveBackendAssetUrl(img)} alt={`Foto ${idx + 1}`} className='rounded-xl object-cover w-full aspect-square shadow-sm' />
							))}
						</div>
					) : null}

					<div className='grid gap-4 grid-cols-1 sm:grid-cols-2'>
						<div className='rounded-xl border border-border bg-background p-4 flex flex-col gap-2'>
							<h2 className='text-base font-bold text-foreground flex items-center gap-2'>Ubicación</h2>
							<p className='text-[0.9rem] text-foreground/80'>{[address.street, address.commune, address.city].filter(Boolean).join(', ') || 'Sin dirección informada.'}</p>
							{hasCoordinates ? (
								<div className='mt-1'>
									<MapContainer
										center={[Number(coordinates.lat), Number(coordinates.lng)]}
										zoom={15}
										scrollWheelZoom={false}
										style={{ height: '180px', width: '100%', borderRadius: '0.75rem', overflow: 'hidden' }}
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
									<a href={mapsDirectionsUrl} target='_blank' rel='noreferrer' className='text-primary hover:underline text-sm mt-2 inline-block font-semibold'>
										Cómo llegar →
									</a>
								</div>
							) : null}
						</div>

						<div className='rounded-xl border border-border bg-background p-4 flex flex-col gap-2'>
							<h2 className='text-base font-bold text-foreground'>Servicios</h2>
							{isWalkerCare && clinicServices.length > 0 ? (
								<div className='flex flex-wrap gap-2'>
									{clinicServices.map((c) => {
										const cid = String(c.id ?? c._id ?? c.displayName ?? 'svc');
										const price =
											c.priceClp != null
												? ` · ${c.priceClp} ${c.currency || 'CLP'}`
												: '';
										const dur = c.slotDurationMinutes ? ` · ${c.slotDurationMinutes} min` : '';
										return (
											<span
												key={cid}
												className='inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1.5 text-sm font-medium text-foreground'
											>
												{c.displayName || 'Servicio'}
												{price}
												{dur}
											</span>
										);
									})}
								</div>
							) : null}
							{services.length > 0 ? (
								<div className='flex flex-col gap-1.5'>
									{isWalkerCare && clinicServices.length > 0 ? (
										<p className='text-xs font-semibold text-muted-foreground'>Descripción adicional</p>
									) : null}
									<div className='flex flex-wrap gap-2'>
										{services.map((service) => (
											<span key={service} className='inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1.5 text-sm font-medium text-foreground'>
												{service}
											</span>
										))}
									</div>
								</div>
							) : null}
							{!isWalkerCare && services.length === 0 ? (
								<p className='text-[0.9rem] text-muted-foreground'>Sin servicios informados.</p>
							) : null}
							{isWalkerCare && clinicServices.length === 0 && services.length === 0 ? (
								<p className='text-[0.9rem] text-muted-foreground'>
									Aún no publica servicios con nombre y tarifa. Puedes igualmente{' '}
									<a href={ctaHref} className='text-primary font-semibold hover:underline'>
										solicitar un servicio
									</a>{' '}
									y acordar detalles por mensaje.
								</p>
							) : null}

							{Array.isArray(perfil.specialties) && perfil.specialties.length > 0 ? (
								<>
									<h2 className='text-base font-bold text-foreground mt-2'>Especialidades</h2>
									<div className='flex flex-wrap gap-2'>
										{perfil.specialties.map((s) => (
											<span key={s} className='inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary'>
												{s}
											</span>
										))}
									</div>
								</>
							) : null}
						</div>

						<div className='rounded-xl border border-border bg-background p-4 flex flex-col gap-2 sm:col-span-2'>
							<h2 className='text-base font-bold text-foreground'>Contacto y horarios</h2>
							<div className='flex flex-wrap gap-x-6 gap-y-1.5 text-[0.9rem]'>
								{provider.phone ? (
									<a className='text-primary hover:underline font-semibold' href={`tel:${provider.phone}`}>
										📞 {provider.phone}
									</a>
								) : null}
								{perfil.schedule ? (
									<span className='text-foreground/80'>🕐 {perfil.schedule}</span>
								) : null}
							</div>
							{(socialMedia.instagram || socialMedia.facebook || socialMedia.twitter || socialMedia.website) ? (
								<div className='flex gap-3 flex-wrap mt-1'>
									{socialMedia.instagram ? <a href={socialMedia.instagram} target='_blank' rel='noreferrer' className='inline-flex h-8 items-center px-3 rounded-lg border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors'>Instagram</a> : null}
									{socialMedia.facebook ? <a href={socialMedia.facebook} target='_blank' rel='noreferrer' className='inline-flex h-8 items-center px-3 rounded-lg border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors'>Facebook</a> : null}
									{socialMedia.twitter ? <a href={socialMedia.twitter} target='_blank' rel='noreferrer' className='inline-flex h-8 items-center px-3 rounded-lg border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors'>Twitter / X</a> : null}
									{socialMedia.website ? <a href={socialMedia.website} target='_blank' rel='noreferrer' className='inline-flex h-8 items-center px-3 rounded-lg border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors'>Sitio web</a> : null}
								</div>
							) : null}
						</div>
					</div>

					{isTemporarilyClosed ? (
						<p className='text-sm text-muted-foreground rounded-xl border border-border bg-muted/30 px-4 py-3'>
							Este proveedor está temporalmente cerrado. No es posible agendar por ahora.
						</p>
					) : null}
				</div>
			) : null}

			{activeTab === 'resenas' ? (
				<div className='p-5 sm:p-6'>
					{resenaCitaId ? (
							<>
								<OwnerAppointmentReviewPanel
									appointmentId={resenaCitaId}
									providerName={`${provider.name || ''} ${provider.lastName || ''}`.trim()}
									onReviewSaved={() => setProfileReviewTick((t) => t + 1)}
								/>
								<p className='text-muted-foreground mb-2'>
									<button
										type='button'
										className='bg-transparent border-none p-0 text-primary font-[inherit] underline cursor-pointer'
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

						<section className='flex flex-col gap-3'>
							<h2 className='text-base font-bold text-foreground'>Reseñas</h2>
							{reviewListMeta.basedOnLabel ? (
								<p className='text-muted-foreground mt-0'>{reviewListMeta.basedOnLabel}</p>
							) : null}
							{summary?.distributionWithPercent && summary.count > 0 ? (
								<div className='my-3 mb-4 max-w-[20rem]' aria-label='Distribución de estrellas'>
									{[5, 4, 3, 2, 1].map((s) => {
										const d = summary.distributionWithPercent[s] || { count: 0, percent: 0 };
										return (
											<div key={s} className='flex items-center gap-2 my-0.5 text-[0.85rem]'>
												<span className='w-10'>{s} ★</span>
												<div className='flex-1 h-2 bg-border rounded-full overflow-hidden'>
													<div
														className='h-full bg-primary rounded-full min-w-0'
														style={{ width: `${Math.min(100, d.percent)}%` }}
													/>
												</div>
												<span className='w-10 text-right'>{d.percent}%</span>
											</div>
										);
									})}
								</div>
							) : null}
						<div className='mb-4 flex items-center gap-3'>
							<label className='flex items-center gap-2 text-sm'>
								<span className='text-muted-foreground font-medium'>Ordenar</span>
								<select
									className='h-9 rounded-xl border border-input bg-background px-3 py-1.5 text-sm font-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors'
									value={orden}
									onChange={(e) => setOrden(e.target.value)}
								>
									<option value='reciente'>Más recientes</option>
									<option value='mayor'>Mejor puntuación</option>
									<option value='menor'>Menor puntuación</option>
								</select>
							</label>
						</div>
						{reportToast ? (
							<p className='text-sm font-semibold text-emerald-700 dark:text-emerald-400'>{reportToast}</p>
						) : null}
						{reviewsState.loading && reviewsState.items.length === 0 ? (
							<div className='flex items-center gap-2 py-6 text-muted-foreground'>
								<div className='w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin' />
								<span className='text-sm'>Cargando reseñas…</span>
							</div>
						) : reviewsState.items.length === 0 ? (
							<p className='text-muted-foreground text-sm py-4'>{reviewListMeta.emptyHint || 'Nadie ha publicado reseñas aún.'}</p>
						) : (
							<ul className='m-0 p-0 list-none flex flex-col gap-3'>
								{reviewsState.items.map((r) => (
									<li key={String(r.id)} className='rounded-xl border border-border bg-background p-4 shadow-sm'>
											<div className='flex flex-wrap items-center gap-2 mb-1.5'>
												<Stars value={r.rating} />
												<span className='font-semibold text-foreground'>
													{r.author
														? `${r.author.name || ''} ${r.author.lastName || ''}`.trim() || 'Dueño'
														: 'Usuario'}
												</span>
												<span className='text-[0.85rem] text-muted-foreground'>{formatReviewDate(r.createdAt)}</span>
												{getStoredAuthToken() && canReportReview(r) ? (
													<button
														type='button'
														className='bg-transparent border-none p-0 text-primary font-[inherit] underline cursor-pointer text-sm'
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
												<p className='m-0 leading-snug text-[#334155] dark:text-foreground'>
													{r.observation || r.comment}
												</p>
											) : null}
											{r.providerResponse ? (
												<div className='mt-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 dark:bg-teal-950/30 dark:border-teal-800'>
													<p className='m-0 text-[0.8rem] font-semibold text-teal-700 dark:text-teal-300'>
														{r.providerResponse.label || 'Respuesta'}
													</p>
													<p className='m-0 leading-snug text-[#334155] dark:text-foreground mt-1'>
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
								className='mt-2 inline-flex h-9 items-center px-4 rounded-xl border border-border bg-background text-foreground text-sm font-semibold hover:bg-muted transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed'
								onClick={loadMoreReviews}
								disabled={reviewsState.loading}
							>
								{reviewsState.loading ? 'Cargando…' : 'Cargar más reseñas'}
							</button>
						) : null}
						<p className='text-sm text-muted-foreground mt-5 rounded-xl border border-border/60 bg-muted/20 px-4 py-3'>
							{isOwner ? (
								<>
									La valoración pública exige la cita en estado <strong>completada</strong>. Puedes publicarla en{' '}
									<Link to='/cuenta/reservas' className='text-primary hover:underline font-semibold'>Reservas</Link>.
								</>
							) : getStoredAuthToken() ? (
								<>
									Tras un servicio completado, el dueño podrá reseñar desde{' '}
									<Link to='/cuenta/reservas' className='text-primary hover:underline font-semibold'>su cuenta, reservas</Link>.
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
				</div>
				) : null}
			</section>

		{!isTemporarilyClosed ? (
			<div className='fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur-sm border-t border-border md:hidden z-10'>
				<a
					className='flex items-center justify-center rounded-xl bg-primary h-12 font-bold text-primary-foreground no-underline hover:bg-primary/90 transition-colors w-full text-base'
					href={ctaHref}
				>
					{cta.label}
				</a>
			</div>
		) : null}
		</div>
	);
}
