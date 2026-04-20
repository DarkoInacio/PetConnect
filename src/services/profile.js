import { api } from './api';

export async function fetchMyProfile(signal) {
	const { data } = await api.get('/profile/me', { signal });
	return data.user;
}

export async function updateMyProfile({ name, lastName, phone, profileImageFile }) {
	const fd = new FormData();
	if (name != null) fd.append('name', name);
	if (lastName != null) fd.append('lastName', lastName);
	if (phone != null) fd.append('phone', phone);
	if (profileImageFile) fd.append('profileImage', profileImageFile);
	const { data } = await api.put('/profile/me', fd);
	return data;
}
