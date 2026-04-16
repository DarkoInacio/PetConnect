import { api } from './api';

export async function fetchMyProfile(signal) {
	const { data } = await api.get('/profile/me', { signal });
	return data.user;
}
