import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { downloadEncounterAttachmentBlob, getClinicalEncounterDetail } from '../services/pets';

function downloadBlob(blob, filename) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

export function PetEncounterDetailPage() {
	const { petId, encounterId } = useParams();
	const { user, loading: authLoading } = useAuth();
	const [enc, setEnc] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		if (authLoading || !user || !petId || !encounterId) return;
		const c = new AbortController();
		(async () => {
			try {
				setLoading(true);
				const data = await getClinicalEncounterDetail(petId, encounterId, c.signal);
				setEnc(data.encounter || null);
			} catch (err) {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setError(err.response?.data?.message || 'No se pudo cargar la atención.');
			} finally {
				setLoading(false);
			}
		})();
		return () => c.abort();
	}, [authLoading, user, petId, encounterId]);

	if (authLoading || loading) {
		return (
			<div className='page'>
				<p>Cargando…</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to='/login' replace />;
	}

	if (!['dueno', 'proveedor'].includes(user.role)) {
		return (
			<div className='page'>
				<p className='error'>No autorizado.</p>
			</div>
		);
	}

	if (error || !enc) {
		return (
			<div className='page'>
				<Link className='back-link' to={`/mascotas/${petId}/ficha`}>
					Volver
				</Link>
				<p className='error'>{error || 'No encontrada.'}</p>
			</div>
		);
	}

	const vet = enc.providerId;
	const vetName = vet ? `${vet.name || ''} ${vet.lastName || ''}`.trim() : '';

	async function onDownloadAtt(i, originalName) {
		try {
			const blob = await downloadEncounterAttachmentBlob(petId, encounterId, i);
			downloadBlob(blob, originalName || `adjunto-${i + 1}`);
		} catch (err) {
			setError(err.response?.data?.message || 'No se pudo descargar.');
		}
	}

	return (
		<div className='page'>
			<Link className='back-link' to={`/mascotas/${petId}/ficha`}>
				Historial
			</Link>
			<h1>Atención clínica</h1>
			<p className='muted'>
				{new Date(enc.occurredAt).toLocaleString('es-CL', { dateStyle: 'full', timeStyle: 'short' })}
			</p>
			<p>
				<strong>Tipo:</strong> {enc.type}
			</p>
			<p>
				<strong>Motivo:</strong> {enc.motivo}
			</p>
			{enc.diagnostico ? (
				<p>
					<strong>Diagnóstico:</strong> {enc.diagnostico}
				</p>
			) : null}
			{enc.tratamiento ? (
				<p>
					<strong>Tratamiento:</strong> {enc.tratamiento}
				</p>
			) : null}
			{enc.observaciones ? (
				<p>
					<strong>Observaciones:</strong> {enc.observaciones}
				</p>
			) : null}
			{vetName ? (
				<p>
					<strong>Profesional:</strong> {vetName}
				</p>
			) : null}
			{Array.isArray(enc.medications) && enc.medications.length > 0 ? (
				<section>
					<h2>Medicación</h2>
					<ul>
						{enc.medications.map((m, idx) => (
							<li key={idx}>
								{m.nombre} {m.dosis ? `· ${m.dosis}` : ''} {m.frecuencia ? `· ${m.frecuencia}` : ''}
							</li>
						))}
					</ul>
				</section>
			) : null}
			{enc.proximoControl?.fecha ? (
				<p>
					<strong>Próximo control:</strong>{' '}
					{new Date(enc.proximoControl.fecha).toLocaleDateString('es-CL')} {enc.proximoControl.motivo || ''}
				</p>
			) : null}
			{Array.isArray(enc.attachments) && enc.attachments.length > 0 ? (
				<section>
					<h2>Adjuntos</h2>
					<ul>
						{enc.attachments.map((a, i) => (
							<li key={i}>
								<button type='button' className='link-like' onClick={() => onDownloadAtt(i, a.originalName)}>
									{a.originalName || `Archivo ${i + 1}`}
								</button>
							</li>
						))}
					</ul>
				</section>
			) : null}
			{Array.isArray(enc.retractionComments) && enc.retractionComments.length > 0 ? (
				<section>
					<h2>Comentarios posteriores</h2>
					<ul>
						{enc.retractionComments.map((r, idx) => (
							<li key={idx}>
								<em>{r.signerName || 'Profesional'}</em>: {r.text}
							</li>
						))}
					</ul>
				</section>
			) : null}
		</div>
	);
}
