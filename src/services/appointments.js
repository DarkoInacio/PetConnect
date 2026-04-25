import { api } from './api';

/**
 * Uso: fetchAvailableSlots(pid, ymd) | fetchAvailableSlots(pid, ymd, signal) | fetchAvailableSlots(pid, ymd, { clinicServiceId }, signal)
 * @param {string} providerId
 * @param {string|undefined} dateYmd
 * @param {{ clinicServiceId?: string }|AbortSignal|undefined} [optionsOrSignal]
 * @param {AbortSignal|undefined} [signal]
 */
export async function fetchAvailableSlots(providerId, dateYmd, optionsOrSignal, signal) {
	let options = null;
	/** @type {AbortSignal|undefined} */ let sig;
	if (optionsOrSignal && typeof optionsOrSignal.addEventListener === 'function') {
		sig = optionsOrSignal;
	} else {
		options = optionsOrSignal;
		sig = signal;
	}
	const params = {};
	if (dateYmd) params.date = dateYmd;
	if (options && options.clinicServiceId) params.clinicServiceId = options.clinicServiceId;
	const { data } = await api.get(`/appointments/providers/${providerId}/available-slots`, { params, signal: sig });
	return data;
}

export async function createSlotAppointment(payload) {
	const { data } = await api.post('/appointments', payload);
	return data;
}

export async function fetchMyAppointments(signal) {
	const { data } = await api.get('/appointments/mine', { signal });
	return data;
}

export async function cancelMyAppointment(appointmentId, cancellationReason) {
	const { data } = await api.patch(`/appointments/${appointmentId}/cancel`, {
		cancellationReason
	});
	return data;
}

export async function confirmAppointmentAsProvider(appointmentId) {
	const { data } = await api.patch(`/appointments/${appointmentId}/provider/confirm`);
	return data;
}

export async function cancelAppointmentAsProvider(appointmentId, cancellationReason) {
	const { data } = await api.patch(`/appointments/${appointmentId}/provider/cancel`, {
		cancellationReason
	});
	return data;
}

/** Solo bookingSource walker_request (paseo/cuidado). */
export async function completeWalkerAppointmentAsProvider(appointmentId) {
	const { data } = await api.patch(`/appointments/${appointmentId}/provider/complete-walker`);
	return data;
}

/** Solo bookingSource availability_slot (clínica / franja de agenda). */
export async function completeVetClinicAppointmentAsProvider(appointmentId) {
	const { data } = await api.patch(`/appointments/${appointmentId}/provider/complete-vet`);
	return data;
}
