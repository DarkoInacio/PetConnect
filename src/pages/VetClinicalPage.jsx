import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { createClinicalEncounter } from '../services/vet';

const ENCOUNTER_TYPES = [
	{ value: 'consulta', label: 'Consulta' },
	{ value: 'vacuna', label: 'Vacuna' },
	{ value: 'otro', label: 'Otro' }
];

export function VetClinicalPage() {
	const { user, loading: authLoading } = useAuth();
	const [searchParams] = useSearchParams();
	const appointmentId = searchParams.get('appointmentId') || '';
	const petId = searchParams.get('petId') || '';

	const [type, setType] = useState('consulta');
	const [motivo, setMotivo] = useState('');
	const [diagnostico, setDiagnostico] = useState('');
	const [tratamiento, setTratamiento] = useState('');
	const [observaciones, setObservaciones] = useState('');
	const [files, setFiles] = useState([]);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [ok, setOk] = useState('');

	if (authLoading) {
		return (
			<div className='page'>
				<p>Cargando…</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to='/login' replace state={{ from: '/proveedor/atencion-clinica' }} />;
	}

	if (user.role !== 'proveedor' || user.providerType !== 'veterinaria') {
		return (
			<div className='page'>
				<Link className='back-link' to='/proveedor'>
					Panel
				</Link>
				<p className='error'>Solo veterinarias aprobadas pueden registrar atenciones clínicas.</p>
			</div>
		);
	}

	async function onSubmit(e) {
		e.preventDefault();
		setError('');
		setOk('');
		if (!appointmentId || !petId) {
			setError('Faltan appointmentId y petId en la URL.');
			return;
		}
		if (!motivo.trim()) {
			setError('El motivo es obligatorio.');
			return;
		}
		setSaving(true);
		try {
			await createClinicalEncounter(
				petId,
				{
					appointmentId,
					type,
					motivo: motivo.trim(),
					diagnostico: diagnostico.trim(),
					tratamiento: tratamiento.trim(),
					observaciones: observaciones.trim()
				},
				files
			);
			setOk('Atención registrada.');
			setFiles([]);
		} catch (err) {
			setError(err.response?.data?.message || 'No se pudo registrar.');
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className='page provider-edit-page'>
			<Link className='back-link' to='/proveedor'>
				Panel proveedor
			</Link>
			<h1>Registro clínico</h1>
			<p className='muted'>
				Cita: <code>{appointmentId || '—'}</code> · Mascota: <code>{petId || '—'}</code>
			</p>
			<p className='hint muted'>
				Abre esta página desde el panel cuando la reserva tenga mascota vinculada y la cita esté confirmada o
				completada dentro del plazo permitido por el backend.
			</p>

			<form className='edit-fieldset' onSubmit={onSubmit}>
				<label className='edit-field'>
					<span>Tipo</span>
					<select value={type} onChange={(e) => setType(e.target.value)}>
						{ENCOUNTER_TYPES.map((t) => (
							<option key={t.value} value={t.value}>
								{t.label}
							</option>
						))}
					</select>
				</label>
				<label className='edit-field'>
					<span>Motivo / anamnesis</span>
					<textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
				</label>
				<label className='edit-field'>
					<span>Diagnóstico</span>
					<textarea rows={3} value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} />
				</label>
				<label className='edit-field'>
					<span>Tratamiento</span>
					<textarea rows={2} value={tratamiento} onChange={(e) => setTratamiento(e.target.value)} />
				</label>
				<label className='edit-field'>
					<span>Observaciones</span>
					<textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
				</label>
				<label className='edit-field'>
					<span>Adjuntos (máx. 3, JPG/PNG/PDF)</span>
					<input
						type='file'
						multiple
						accept='image/jpeg,image/png,application/pdf'
						onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 3))}
					/>
				</label>
				{error ? <p className='error'>{error}</p> : null}
				{ok ? <p className='review-success'>{ok}</p> : null}
				<button type='submit' className='save-profile-btn' disabled={saving}>
					{saving ? 'Guardando…' : 'Registrar atención'}
				</button>
			</form>
		</div>
	);
}
