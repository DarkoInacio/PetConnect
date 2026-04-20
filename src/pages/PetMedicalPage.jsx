import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { downloadMedicalPdfBlob, getMedicalSummary, listClinicalEncounters } from '../services/pets';

function downloadBlob(blob, filename) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

export function PetMedicalPage() {
	const { petId } = useParams();
	const { user, loading: authLoading } = useAuth();
	const [summary, setSummary] = useState(null);
	const [encounters, setEncounters] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [pdfLoading, setPdfLoading] = useState(false);

	useEffect(() => {
		if (authLoading || !user || user.role !== 'dueno' || !petId) return;
		const c = new AbortController();
		(async () => {
			try {
				setLoading(true);
				const [s, e] = await Promise.all([
					getMedicalSummary(petId, c.signal),
					listClinicalEncounters(petId, {}, c.signal)
				]);
				setSummary(s);
				setEncounters(Array.isArray(e.encounters) ? e.encounters : []);
			} catch (err) {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setError(err.response?.data?.message || 'No se pudo cargar el historial.');
			} finally {
				setLoading(false);
			}
		})();
		return () => c.abort();
	}, [authLoading, user, petId]);

	if (authLoading || loading) {
		return (
			<div className='page'>
				<p>Cargando…</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to='/login' replace state={{ from: `/mascotas/${petId}/ficha` }} />;
	}

	if (user.role !== 'dueno') {
		return (
			<div className='page'>
				<Link className='back-link' to='/'>
					Inicio
				</Link>
				<p className='error'>Solo dueños.</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className='page'>
				<Link className='back-link' to={`/mascotas/${petId}`}>
					Volver
				</Link>
				<p className='error'>{error}</p>
			</div>
		);
	}

	const p = summary?.pet;

	async function onExportPdf() {
		setPdfLoading(true);
		try {
			const blob = await downloadMedicalPdfBlob(petId);
			downloadBlob(blob, `historial-${petId}.pdf`);
		} catch (err) {
			setError(err.response?.data?.message || 'No se pudo generar el PDF.');
		} finally {
			setPdfLoading(false);
		}
	}

	return (
		<div className='page'>
			<Link className='back-link' to={`/mascotas/${petId}`}>
				Ficha de la mascota
			</Link>
			<h1>Historial clínico</h1>
			{p ? (
				<p>
					<strong>{p.name}</strong> · {p.species} · {p.status === 'deceased' ? 'fallecida' : 'activa'}
				</p>
			) : null}
			{summary?.summary ? (
				<p className='muted'>
					Atenciones registradas: <strong>{summary.summary.totalEncounters}</strong>
					{summary.summary.lastVisitAt ? (
						<>
							{' '}
							· Última visita:{' '}
							{new Date(summary.summary.lastVisitAt).toLocaleString('es-CL', {
								dateStyle: 'medium',
								timeStyle: 'short'
							})}
						</>
					) : null}
				</p>
			) : null}
			<p>
				<button type='button' className='save-profile-btn' disabled={pdfLoading} onClick={onExportPdf}>
					{pdfLoading ? 'Generando…' : 'Descargar PDF del historial'}
				</button>
			</p>

			<h2>Atenciones</h2>
			{encounters.length === 0 ? <p className='muted'>Aún no hay atenciones clínicas registradas.</p> : null}
			<ul className='encounters-list'>
				{encounters.map((row) => (
					<li key={String(row.id)}>
						<Link to={`/mascotas/${petId}/atencion/${row.id}`}>
							{new Date(row.occurredAt).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}{' '}
							— {row.type} — {row.motivo?.slice(0, 80)}
							{row.motivo?.length > 80 ? '…' : ''}
						</Link>
						{row.veterinaria ? <span className='muted'> · {row.veterinaria}</span> : null}
					</li>
				))}
			</ul>
		</div>
	);
}
