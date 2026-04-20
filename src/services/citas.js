import { api } from './api';

export async function createLegacyCita(payload) {
	const { data } = await api.post('/citas', payload);
	return data;
}

export async function listMisCitas(params = {}, signal) {
	const { data } = await api.get('/citas/mis-citas', { params, signal });
	return data;
}

export async function listProximasCitas(signal) {
	const { data } = await api.get('/citas/proximas', { signal });
	return data;
}

export async function cancelCitaAsOwner(citaId) {
	const { data } = await api.patch(`/citas/${citaId}/cancelar`);
	return data;
}

export async function rescheduleCita(citaId, fechaIso) {
	const { data } = await api.patch(`/citas/${citaId}/reagendar`, { fecha: fechaIso });
	return data;
}

export async function recordCitaDiagnostico(citaId, diagnostico) {
	const { data } = await api.patch(`/citas/${citaId}/diagnostico`, { diagnostico });
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
