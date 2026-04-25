import { api } from './api';

/**
 * Ruta de perfil en el front: slug público si existe, si no por id.
 * @param {{ id: string, providerType?: string, publicSlug?: string | null, providerProfile?: { publicSlug?: string | null } }} p
 */
export function getProviderProfilePath(p) {
	if (!p?.id) return '/';
	const slug = p.publicSlug || p.providerProfile?.publicSlug || null;
	const tipo = p.providerType;
	if (slug && tipo) {
		return `/proveedores/perfil/${encodeURIComponent(tipo)}/${encodeURIComponent(String(slug).toLowerCase())}`;
	}
	return `/proveedores/${p.id}`;
}

/**
 * Añade `?resenaCita=` a la ruta de perfil (Mis reservas → perfil del proveedor → reseña).
 * @param {string} profilePath
 * @param {string} appointmentId
 */
export function withResenaCitaParam(profilePath, appointmentId) {
	if (!profilePath || appointmentId == null || String(appointmentId).trim() === '') return profilePath;
	const id = String(appointmentId).trim();
	const hasQ = profilePath.includes('?');
	return `${profilePath}${hasQ ? '&' : '?'}pestana=resenas&resenaCita=${encodeURIComponent(id)}`;
}

export async function fetchProvidersMapData(params = {}, signal) {
	const { data } = await api.get('/proveedores/mapa', {
		params,
		signal
	});
	return data;
}

export async function fetchProviderPublicProfile(providerId, signal) {
	const { data } = await api.get(`/proveedores/${providerId}/perfil`, {
		signal
	});
	return data;
}

export async function fetchProviderPublicProfileBySlug(tipo, slug, signal) {
	const { data } = await api.get(
		`/proveedores/perfil/${encodeURIComponent(tipo)}/${encodeURIComponent(String(slug).trim().toLowerCase())}`,
		{ signal }
	);
	return data;
}

/**
 * Listado público de reseñas. `orden`: reciente | mayor | menor (también acepta el backend alta/baja, rating_mayor/menor).
 * @param {string} providerId
 * @param {{ pagina?: number, limite?: number, orden?: string }} [params]
 * @param {AbortSignal} [signal]
 */
export async function fetchProviderReviews(
	providerId,
	{ pagina = 1, limite = 5, orden = 'reciente' } = {},
	signal
) {
	const { data } = await api.get(`/proveedores/${providerId}/reviews`, {
		params: { pagina, limite, orden },
		signal
	});
	return data;
}

export async function updateMyProviderProfile(payload) {
	const { data } = await api.put('/proveedores/mi-perfil', payload);
	return data;
}

export async function requestWalkerService(payload) {
	const { data } = await api.post('/proveedores/solicitar-servicio', payload);
	return data;
}

export async function listApprovedProviders(params = {}, signal) {
	const { data } = await api.get('/proveedores', { params, signal });
	return data;
}

export async function searchProviders(params = {}, signal) {
	const { data } = await api.get('/proveedores/buscar', { params, signal });
	return data;
}
