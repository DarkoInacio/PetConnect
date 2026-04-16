import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, getStoredAuthToken, setStoredAuthToken } from '../services/api';
import { fetchMyProfile } from '../services/profile';
import { AuthContext } from './authContext';

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);

	const refreshUser = useCallback(async () => {
		const token = getStoredAuthToken();
		if (!token) {
			setUser(null);
			setLoading(false);
			return;
		}
		try {
			const u = await fetchMyProfile();
			setUser(u);
		} catch {
			setStoredAuthToken(null);
			setUser(null);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		refreshUser();
	}, [refreshUser]);

	const login = useCallback(async (email, password) => {
		const { data } = await api.post('/auth/login', { email, password });
		setStoredAuthToken(data.token);
		setLoading(true);
		try {
			const u = await fetchMyProfile();
			setUser(u);
		} finally {
			setLoading(false);
		}
		return data;
	}, []);

	const logout = useCallback(() => {
		setStoredAuthToken(null);
		setUser(null);
	}, []);

	const value = useMemo(
		() => ({ user, loading, login, logout, refreshUser }),
		[user, loading, login, logout, refreshUser]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
