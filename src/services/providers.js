import { api } from './api';

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
