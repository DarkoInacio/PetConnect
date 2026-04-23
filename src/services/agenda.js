import { api } from './api';

export async function generateAgendaSlots(body) {
	const { data } = await api.post('/provider/agenda/generate', body);
	return data;
}

/**
 * @param {AbortSignal} [signal]
 * @param {Record<string, string|undefined>} [query] fromYmd, toYmd, onlyFuture
 */
export async function listMyAgendaSlots(signal, query) {
	const { data } = await api.get('/provider/agenda/slots', { signal, params: query });
	return data;
}

export async function deleteAgendaSlot(slotId) {
	const { data } = await api.delete(`/provider/agenda/slots/${slotId}`);
	return data;
}

export async function blockAgendaSlot(slotId) {
	const { data } = await api.patch(`/provider/agenda/slots/${slotId}/block`);
	return data;
}

export async function unblockAgendaSlot(slotId) {
	const { data } = await api.patch(`/provider/agenda/slots/${slotId}/unblock`);
	return data;
}

/**
 * Olvida las franjas que borraste a mano, en días from–to (YYYY-MM-DD, hora de agenda = Chile)
 * @param {{ from: string, to: string }} range
 */
export async function clearOmittedAgendaSlots(range) {
	const { data } = await api.delete('/provider/agenda/omits', { params: { from: range.from, to: range.to } });
	return data;
}
