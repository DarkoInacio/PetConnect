import { api } from './api';

export async function runReminders24h() {
	const { data } = await api.post('/admin/jobs/reminders24h/run');
	return data;
}
