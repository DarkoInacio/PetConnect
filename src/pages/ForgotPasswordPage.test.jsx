import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { forgotPassword } from '../services/authForms';
import { ForgotPasswordPage } from './ForgotPasswordPage';

vi.mock('../services/authForms', () => ({
	forgotPassword: vi.fn()
}));

describe('ForgotPasswordPage', () => {
	it('muestra mensaje de éxito tras solicitar recuperación', async () => {
		forgotPassword.mockResolvedValueOnce({ message: 'Revisa tu correo.' });

		const user = userEvent.setup();
		render(
			<MemoryRouter>
				<ForgotPasswordPage />
			</MemoryRouter>
		);

		await user.type(screen.getByLabelText(/correo electrónico/i), 'dueno@test.com');
		await user.click(screen.getByRole('button', { name: /enviar instrucciones/i }));

		expect(forgotPassword).toHaveBeenCalledWith('dueno@test.com');
		expect(await screen.findByRole('status')).toHaveTextContent('Revisa tu correo.');
	});

	it('muestra error si la API falla', async () => {
		forgotPassword.mockRejectedValueOnce({
			response: { data: { message: 'Email obligatorio' } }
		});

		const user = userEvent.setup();
		render(
			<MemoryRouter>
				<ForgotPasswordPage />
			</MemoryRouter>
		);

		await user.type(screen.getByLabelText(/correo electrónico/i), 'mal@test.com');
		await user.click(screen.getByRole('button', { name: /enviar instrucciones/i }));

		expect(await screen.findByRole('alert')).toHaveTextContent('Email obligatorio');
	});
});
