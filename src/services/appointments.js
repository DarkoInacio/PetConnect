import { api } from './api';

export async function fetchAvailableSlots(providerId, dateYmd, signal) {
	const { data } = await api.get(`/appointments/providers/${providerId}/available-slots`, {
		params: dateYmd ? { date: dateYmd } : {},
		signal
	});
	return data;
}

export async function createSlotAppointment(payload) {
	const { data } = await api.post('/appointments', payload);
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
