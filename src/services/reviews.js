import { api } from './api';

export const REPORT_REASON_OPTIONS = [
	{ value: 'contenido_falso', label: 'Contenido falso o engañoso' },
	{ value: 'lenguaje_ofensivo', label: 'Lenguaje ofensivo' },
	{ value: 'spam', label: 'Spam' },
	{ value: 'informacion_personal', label: 'Información personal' },
	{ value: 'otro', label: 'Otro' }
];

/**
 * @param {string} appointmentId
 * @param {AbortSignal} [signal]
 */
export async function fetchReviewEligibility(appointmentId, signal) {
	const { data } = await api.get(`/appointments/${appointmentId}/review-eligibility`, { signal });
	return data;
}

/**
 * @param {string} appointmentId
 * @param {{ rating: number, comment?: string }} body
 */
export async function createReviewForAppointment(appointmentId, body) {
	const { data } = await api.post(`/appointments/${appointmentId}/reviews`, body);
	return data;
}

/**
 * @param {string} reviewId
 * @param {{ rating?: number, comment?: string }} body
 */
export async function updateMyReview(reviewId, body) {
	const { data } = await api.patch(`/reviews/${reviewId}`, body);
	return data;
}

/**
 * @param {string} reviewId
 * @param {{ reason: string, otherText?: string }} body
 */
export async function reportReview(reviewId, body) {
	const { data } = await api.post(`/reviews/${reviewId}/report`, body);
	return data;
}

/**
 * @param {AbortSignal} [signal]
 * @param {{ prioridad?: 'pendientes' | 'recientes' }} [opts]
 */
export async function fetchProviderOwnReviews(signal, opts = {}) {
	const { data } = await api.get('/provider/reviews', {
		params: { prioridad: opts.prioridad ?? 'pendientes' },
		signal
	});
	return data;
}

/**
 * @param {string} reviewId
 * @param {{ text: string }} body
 */
export async function upsertProviderReply(reviewId, body) {
	const { data } = await api.put(`/provider/reviews/${reviewId}/reply`, body);
	return data;
}
