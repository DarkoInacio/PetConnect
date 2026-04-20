import { api } from './api';

/**
 * Registro clínico asociado a una cita (veterinaria aprobada).
 * @param {string} petId
 * @param {object} fields - appointmentId, type, motivo, diagnostico, tratamiento, observaciones, occurredAt, medications (array), proximoControl ({ fecha, motivo })
 * @param {File[]} attachmentFiles - máx. 3
 */
export async function createClinicalEncounter(petId, fields, attachmentFiles = []) {
	const fd = new FormData();
	fd.append('appointmentId', fields.appointmentId);
	fd.append('type', fields.type || 'consulta');
	fd.append('motivo', fields.motivo);
	if (fields.diagnostico != null) fd.append('diagnostico', fields.diagnostico);
	if (fields.tratamiento != null) fd.append('tratamiento', fields.tratamiento);
	if (fields.observaciones != null) fd.append('observaciones', fields.observaciones);
	if (fields.occurredAt) fd.append('occurredAt', fields.occurredAt);
	if (fields.medications && fields.medications.length) {
		fd.append('medications', JSON.stringify(fields.medications));
	}
	if (fields.proximoControl && (fields.proximoControl.fecha || fields.proximoControl.motivo)) {
		fd.append('proximoControl', JSON.stringify(fields.proximoControl));
	}
	for (const f of attachmentFiles.slice(0, 3)) {
		fd.append('attachments', f);
	}
	const { data } = await api.post(`/vet/pets/${petId}/clinical-encounters`, fd);
	return data;
}

export async function updateClinicalEncounter(encounterId, fields, attachmentFiles = []) {
	const files = (attachmentFiles || []).slice(0, 3);
	if (files.length > 0) {
		const fd = new FormData();
		if (fields.type != null) fd.append('type', fields.type);
		if (fields.motivo != null) fd.append('motivo', fields.motivo);
		if (fields.diagnostico != null) fd.append('diagnostico', fields.diagnostico);
		if (fields.tratamiento != null) fd.append('tratamiento', fields.tratamiento);
		if (fields.observaciones != null) fd.append('observaciones', fields.observaciones);
		if (fields.occurredAt != null) fd.append('occurredAt', fields.occurredAt);
		if (fields.medications != null) fd.append('medications', JSON.stringify(fields.medications));
		if (fields.proximoControl !== undefined) fd.append('proximoControl', JSON.stringify(fields.proximoControl));
		for (const f of files) fd.append('attachments', f);
		const { data } = await api.patch(`/vet/clinical-encounters/${encounterId}`, fd);
		return data;
	}
	const body = {};
	if (fields.type !== undefined) body.type = fields.type;
	if (fields.motivo !== undefined) body.motivo = fields.motivo;
	if (fields.diagnostico !== undefined) body.diagnostico = fields.diagnostico;
	if (fields.tratamiento !== undefined) body.tratamiento = fields.tratamiento;
	if (fields.observaciones !== undefined) body.observaciones = fields.observaciones;
	if (fields.occurredAt !== undefined) body.occurredAt = fields.occurredAt;
	if (fields.medications !== undefined) body.medications = JSON.stringify(fields.medications);
	if (fields.proximoControl !== undefined) body.proximoControl = JSON.stringify(fields.proximoControl);
	const { data } = await api.patch(`/vet/clinical-encounters/${encounterId}`, body);
	return data;
}

export async function addEncounterRetractionComment(encounterId, text) {
	const { data } = await api.post(`/vet/clinical-encounters/${encounterId}/retractions`, { text });
	return data;
}
