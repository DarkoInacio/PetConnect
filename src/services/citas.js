import { api } from './api';

export async function createLegacyCita(payload) {
	const { data } = await api.post('/citas', payload);
	return data;
}

export async function confirmCitaAsProvider(citaId) {
	const { data } = await api.patch(`/citas/${citaId}/proveedor/confirmar`);
	return data;
}

export async function cancelCitaAsProvider(citaId, motivo) {
	const { data } = await api.patch(`/citas/${citaId}/proveedor/cancelar`, { motivo });
	return data;
}
