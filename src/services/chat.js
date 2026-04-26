import { api } from './api';

export async function sendChatMessage({ message, history }) {
	const { data } = await api.post('/chat', { message, history });
	return data;
}

/** Cierra la conversación en el servidor y devuelve un saludo nuevo (nueva sessionId). */
export async function resetChatSession({ history } = {}) {
	const { data } = await api.post('/chat', { reset: true, history });
	return data;
}

