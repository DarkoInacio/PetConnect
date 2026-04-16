import { api } from './api';

export async function fetchMyBookings(signal) {
	const { data } = await api.get('/bookings/mine', { signal });
	return data;
}

export async function fetchProviderBookings(signal) {
	const { data } = await api.get('/bookings/provider/mine', { signal });
	return data;
}
