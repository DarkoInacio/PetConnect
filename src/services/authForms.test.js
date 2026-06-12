import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { forgotPassword, registerOwner, resetPassword } from './authForms';

vi.mock('./api', () => ({
	api: {
		post: vi.fn()
	}
}));

describe('authForms', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('registerOwner envía payload al endpoint de registro', async () => {
		const payload = {
			name: 'Ana',
			lastName: 'López',
			email: 'ana@test.com',
			password: 'Test1234!'
		};
		api.post.mockResolvedValueOnce({ data: { token: 'jwt', user: { id: '1' } } });

		const data = await registerOwner(payload);

		expect(api.post).toHaveBeenCalledWith('/auth/register', payload);
		expect(data.token).toBe('jwt');
	});

	it('forgotPassword normaliza email en body', async () => {
		api.post.mockResolvedValueOnce({ data: { message: 'Revisa tu correo.' } });

		await forgotPassword('dueno@test.com');

		expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'dueno@test.com' });
	});

	it('resetPassword envía token y nueva clave', async () => {
		api.post.mockResolvedValueOnce({ data: { message: 'Contraseña actualizada' } });

		await resetPassword({ token: 'abc', password: 'Nueva123!' });

		expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
			token: 'abc',
			password: 'Nueva123!'
		});
	});
});
