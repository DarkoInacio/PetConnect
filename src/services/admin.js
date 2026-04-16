import { api } from './api';

export async function fetchPendingProviders(params = {}, signal) {
	const { data } = await api.get('/admin/providers/pending', { params, signal });
	return data;
}

export async function approveProvider(userId) {
	const { data } = await api.patch(`/admin/providers/${userId}/approve`);
	return data;
}

export async function rejectProvider(userId, reason) {
	const { data } = await api.patch(`/admin/providers/${userId}/reject`, { reason });
	return data;
}
