import { api } from './api';

/**
 * @param {AbortSignal} [signal]
 */
export async function listClinicServices(signal) {
	const { data } = await api.get('/provider/clinic-services', { signal });
	return data;
}

export async function createClinicService(body) {
	const { data } = await api.post('/provider/clinic-services', body);
	return data;
}

export async function updateClinicService(id, body) {
	const { data } = await api.patch(`/provider/clinic-services/${id}`, body);
	return data;
}
