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

export async function fetchProviderReviews(providerId, { pagina = 1, limite = 10 } = {}, signal) {
	const { data } = await api.get(`/proveedores/${providerId}/reviews`, {
		params: { pagina, limite },
		signal
	});
	return data;
}

export async function createProviderReview(providerId, { rating, comment }) {
	const { data } = await api.post(`/proveedores/${providerId}/reviews`, {
		rating,
		comment
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
