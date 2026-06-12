import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { resetChatSession, sendChatMessage } from './chat';

vi.mock('./api', () => ({
	api: {
		post: vi.fn()
	}
}));

describe('chat service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('sendChatMessage publica mensaje e historial', async () => {
		const history = [{ role: 'user', content: 'Hola' }];
		api.post.mockResolvedValueOnce({
			data: { message: 'Respuesta', urgencyLevel: 'verde', actions: [] }
		});

		const data = await sendChatMessage({ message: 'Mi gato no come', history });

		expect(api.post).toHaveBeenCalledWith('/chat', { message: 'Mi gato no come', history });
		expect(data.message).toBe('Respuesta');
	});

	it('resetChatSession pide reinicio al backend', async () => {
		api.post.mockResolvedValueOnce({ data: { message: 'Nuevo saludo' } });

		await resetChatSession({ history: [] });

		expect(api.post).toHaveBeenCalledWith('/chat', { reset: true, history: [] });
	});
});
