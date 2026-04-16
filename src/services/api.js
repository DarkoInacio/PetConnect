import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const AUTH_TOKEN_KEY = import.meta.env.VITE_AUTH_TOKEN_KEY || 'petconnect_token';

export function getStoredAuthToken() {
	try {
		return localStorage.getItem(AUTH_TOKEN_KEY);
	} catch {
		return null;
	}
}

export function setStoredAuthToken(token) {
	try {
		if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
		else localStorage.removeItem(AUTH_TOKEN_KEY);
	} catch {
		// ignore
	}
}

export function getBackendOrigin() {
	// Si la baseURL incluye /api, lo removemos para poder construir URLs a /uploads.
	return String(API_BASE_URL).replace(/\/api\/?$/, '');
}

export function resolveBackendAssetUrl(pathname) {
	if (!pathname) return null;
	const raw = String(pathname).trim();
	if (!raw) return null;
	if (/^https?:\/\//i.test(raw)) return raw;
	if (raw.startsWith('/')) return `${getBackendOrigin()}${raw}`;
	return raw;
}

export const api = axios.create({
	baseURL: API_BASE_URL,
	timeout: 15000
});

api.interceptors.request.use((config) => {
	const token = getStoredAuthToken();
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});
