import { api } from './api';

export async function generateAgendaSlots(body) {
	const { data } = await api.post('/provider/agenda/generate', body);
	return data;
}

export async function listMyAgendaSlots(signal) {
	const { data } = await api.get('/provider/agenda/slots', { signal });
	return data;
}

export async function deleteAgendaSlot(slotId) {
	const { data } = await api.delete(`/provider/agenda/slots/${slotId}`);
	return data;
}
