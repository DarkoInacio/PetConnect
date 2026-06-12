import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { sendChatMessage } from '../services/chat';
import { ChatWidget } from './ChatWidget';

vi.mock('../hooks/useAuth', () => ({
	useAuth: () => ({ user: null })
}));

vi.mock('../hooks/useOnlineStatus', () => ({
	useOnlineStatus: vi.fn(() => true)
}));

vi.mock('../services/chat', () => ({
	sendChatMessage: vi.fn(),
	resetChatSession: vi.fn()
}));

describe('ChatWidget', () => {
	beforeEach(() => {
		vi.mocked(useOnlineStatus).mockReturnValue(true);
		vi.clearAllMocks();
	});

	it('envía mensaje y muestra respuesta del asistente', async () => {
		sendChatMessage.mockResolvedValueOnce({
			message: 'Puede ser estrés o cambio de dieta.',
			urgencyLevel: 'amarillo',
			actions: []
		});

		const user = userEvent.setup();
		render(
			<MemoryRouter>
				<ChatWidget />
			</MemoryRouter>
		);

		await user.click(screen.getByRole('button', { name: /abrir chat con vetto/i }));
		await user.type(screen.getByLabelText(/mensaje para vetto/i), 'Mi gato no come');
		await user.click(screen.getByRole('button', { name: /^enviar$/i }));

		await waitFor(() => {
			expect(sendChatMessage).toHaveBeenCalled();
			expect(screen.getByText(/puede ser estrés/i)).toBeInTheDocument();
		});
	});

	it('muestra aviso offline y deshabilita el envío', async () => {
		vi.mocked(useOnlineStatus).mockReturnValue(false);

		const user = userEvent.setup();
		render(
			<MemoryRouter>
				<ChatWidget />
			</MemoryRouter>
		);

		await user.click(screen.getByRole('button', { name: /abrir chat con vetto/i }));

		expect(screen.getByRole('alert')).toHaveTextContent(/sin conexión/i);
		expect(screen.getByLabelText(/mensaje para vetto/i)).toBeDisabled();
		expect(sendChatMessage).not.toHaveBeenCalled();
	});
});
