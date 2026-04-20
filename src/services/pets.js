import { api } from './api';

export async function listPets(params = {}, signal) {
	const { data } = await api.get('/pets', { params, signal });
	return data;
}

export async function getPet(petId, signal) {
	const { data } = await api.get(`/pets/${petId}`, { signal });
	return data;
}

export async function createPet({ name, species, breed, birthDate, sex, color, fotoFile }) {
	const fd = new FormData();
	fd.append('name', name);
	fd.append('species', species);
	fd.append('sex', sex);
	if (breed != null) fd.append('breed', breed);
	if (birthDate != null && String(birthDate).trim()) fd.append('birthDate', birthDate);
	if (color != null) fd.append('color', color);
	if (fotoFile) fd.append('foto', fotoFile);
	const { data } = await api.post('/pets', fd);
	return data;
}

export async function updatePet(petId, fields, fotoFile) {
	const fd = new FormData();
	const { name, species, breed, birthDate, sex, color } = fields;
	if (name !== undefined) fd.append('name', name);
	if (species !== undefined) fd.append('species', species);
	if (breed !== undefined) fd.append('breed', breed);
	if (birthDate !== undefined) fd.append('birthDate', birthDate || '');
	if (sex !== undefined) fd.append('sex', sex);
	if (color !== undefined) fd.append('color', color);
	if (fotoFile) fd.append('foto', fotoFile);
	const { data } = await api.patch(`/pets/${petId}`, fd);
	return data;
}

export async function markPetDeceased(petId) {
	const { data } = await api.patch(`/pets/${petId}/mark-deceased`);
	return data;
}

export async function getMedicalSummary(petId, signal) {
	const { data } = await api.get(`/pets/${petId}/medical-summary`, { signal });
	return data;
}

export async function listClinicalEncounters(petId, params = {}, signal) {
	const { data } = await api.get(`/pets/${petId}/clinical-encounters`, { params, signal });
	return data;
}

export async function getClinicalEncounterDetail(petId, encounterId, signal) {
	const { data } = await api.get(`/pets/${petId}/clinical-encounters/${encounterId}`, { signal });
	return data;
}

/** URL de objeto para mostrar foto (revocar con URL.revokeObjectURL cuando corresponda). */
export async function fetchPetPhotoBlobUrl(petId, signal) {
	const res = await api.get(`/pets/${petId}/photo`, { responseType: 'blob', signal });
	return URL.createObjectURL(res.data);
}

export async function downloadMedicalPdfBlob(petId, signal) {
	const res = await api.get(`/pets/${petId}/medical-record/export.pdf`, {
		responseType: 'blob',
		signal
	});
	return res.data;
}

export async function downloadEncounterAttachmentBlob(petId, encounterId, index, signal) {
	const res = await api.get(`/pets/${petId}/clinical-encounters/${encounterId}/attachments/${index}`, {
		responseType: 'blob',
		signal
	});
	return res.data;
}
