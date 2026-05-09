import { api } from './api';

export async function fetchPendingProviders(params = {}, signal) {
	const { data } = await api.get('/admin/providers/pending', { params, signal });
	return data;
}

export async function fetchActiveProviders(params = {}, signal) {
	const { data } = await api.get('/admin/providers/active', { params, signal });
	return data;
}

export async function fetchSuspendedProviders(params = {}, signal) {
	const { data } = await api.get('/admin/providers/suspended', { params, signal });
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

export async function suspendProvider(userId, reason) {
	const { data } = await api.patch(`/admin/providers/${userId}/suspend`, {
		reason: reason || undefined
	});
	return data;
}

export async function reactivateProvider(userId) {
	const { data } = await api.patch(`/admin/providers/${userId}/reactivate`);
	return data;
}

export async function fetchAuditLogs(params = {}, signal) {
	const { data } = await api.get('/admin/audit-logs', { params, signal });
	return data;
}

/**
 * @param {{ estado?: string }} [params]
 * @param {AbortSignal} [signal]
 */
export async function fetchReviewReports(params = {}, signal) {
	const { data } = await api.get('/admin/review-reports', { params, signal });
	return data;
}

/**
 * @param {string} reportId
 * @param {{ accion: 'aprobar_reseña' | 'eliminar_reseña' | 'suspender_autor' | 'aprobar' | 'eliminar', nota?: string }} body
 */
export async function decideReviewReport(reportId, body) {
	const { data } = await api.patch(`/admin/review-reports/${reportId}`, body);
	return data;
}
