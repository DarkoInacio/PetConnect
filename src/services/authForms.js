import { api } from './api';

export async function registerOwner(payload) {
	const { data } = await api.post('/auth/register', payload);
	return data;
}

export async function registerProviderFormData(formData) {
	const { data } = await api.post('/auth/register-provider', formData);
	return data;
}

export async function forgotPassword(email) {
	const { data } = await api.post('/auth/forgot-password', { email });
	return data;
}

export async function resetPassword(payload) {
	const { data } = await api.post('/auth/reset-password', payload);
	return data;
}
