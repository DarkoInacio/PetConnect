import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

const loginMock = vi.fn();

vi.mock('../hooks/useAuth', () => ({
	useAuth: () => ({ login: loginMock })
}));

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		useNavigate: () => navigateMock
	};
});

describe('LoginPage', () => {
	it('muestra error si el login falla', async () => {
		loginMock.mockRejectedValueOnce({
			response: { data: { message: 'Credenciales inválidas' } }
		});

		const user = userEvent.setup();
		render(
			<MemoryRouter>
				<LoginPage />
			</MemoryRouter>
		);

		await user.type(screen.getByLabelText(/correo/i), 'dueno@test.com');
		await user.type(screen.getByLabelText(/^contraseña$/i), 'mala-clave');
		await user.click(screen.getByRole('button', { name: /^entrar$/i }));

		expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas');
	});

	it('navega tras login exitoso', async () => {
		loginMock.mockResolvedValueOnce({ token: 'jwt', user: { id: '1' } });

		const user = userEvent.setup();
		render(
			<MemoryRouter>
				<LoginPage />
			</MemoryRouter>
		);

		await user.type(screen.getByLabelText(/correo/i), 'dueno@test.com');
		await user.type(screen.getByLabelText(/^contraseña$/i), 'Test1234!');
		await user.click(screen.getByRole('button', { name: /^entrar$/i }));

		await waitFor(() => {
			expect(loginMock).toHaveBeenCalledWith('dueno@test.com', 'Test1234!');
			expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
		});
	});
});
