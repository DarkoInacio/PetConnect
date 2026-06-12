import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAuth } from '../hooks/useAuth';
import { api, getStoredAuthToken, setStoredAuthToken } from '../services/api';
import { fetchMyProfile } from '../services/profile';
import { AuthProvider } from './AuthProvider';

vi.mock('../services/profile', () => ({
	fetchMyProfile: vi.fn()
}));

vi.mock('../services/api', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		api: {
			...actual.api,
			post: vi.fn(),
			get: vi.fn()
		},
		getStoredAuthToken: vi.fn(),
		setStoredAuthToken: vi.fn()
	};
});

function Probe() {
	const { user, loading } = useAuth();
	if (loading) return <p>Cargando…</p>;
	return <p>{user ? `Hola ${user.name}` : 'Sin sesión'}</p>;
}

describe('AuthProvider', () => {
	it('restaura sesión desde token almacenado', async () => {
		getStoredAuthToken.mockReturnValue('jwt-guardado');
		fetchMyProfile.mockResolvedValueOnce({ name: 'Ana', role: 'dueno' });

		render(
			<AuthProvider>
				<Probe />
			</AuthProvider>
		);

		expect(await screen.findByText('Hola Ana')).toBeInTheDocument();
	});

	it('queda sin sesión si el perfil falla', async () => {
		getStoredAuthToken.mockReturnValue('jwt-invalido');
		fetchMyProfile.mockRejectedValueOnce(new Error('401'));

		render(
			<AuthProvider>
				<Probe />
			</AuthProvider>
		);

		expect(await screen.findByText('Sin sesión')).toBeInTheDocument();
		expect(setStoredAuthToken).toHaveBeenCalledWith(null);
	});

	it('login guarda token y carga usuario', async () => {
		getStoredAuthToken.mockReturnValue(null);
		fetchMyProfile
			.mockResolvedValueOnce({ name: 'Luis', role: 'dueno' })
			.mockResolvedValueOnce({ name: 'Luis', role: 'dueno' });

		api.post.mockResolvedValueOnce({ data: { token: 'jwt-nuevo', user: { id: '1' } } });

		let authApi;
		function LoginProbe() {
			authApi = useAuth();
			const { user, loading } = authApi;
			if (loading) return <p>Cargando…</p>;
			return (
				<div>
					<p>{user ? `Hola ${user.name}` : 'Sin sesión'}</p>
					<button type="button" onClick={() => authApi.login('a@test.com', 'pass')}>
						Login
					</button>
				</div>
			);
		}

		render(
			<AuthProvider>
				<LoginProbe />
			</AuthProvider>
		);

		await waitFor(() => expect(screen.getByText('Sin sesión')).toBeInTheDocument());
		screen.getByRole('button', { name: 'Login' }).click();

		await waitFor(() => {
			expect(api.post).toHaveBeenCalledWith('/auth/login', {
				email: 'a@test.com',
				password: 'pass'
			});
			expect(setStoredAuthToken).toHaveBeenCalledWith('jwt-nuevo');
			expect(screen.getByText('Hola Luis')).toBeInTheDocument();
		});
	});
});
