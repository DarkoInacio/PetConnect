import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getPet, markPetDeceased } from '../services/pets';
import { PetPhoto } from '../components/PetPhoto';

export function PetDetailPage() {
	const { petId } = useParams();
	const { user, loading: authLoading } = useAuth();
	const [pet, setPet] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [msg, setMsg] = useState('');

	useEffect(() => {
		if (authLoading || !user || user.role !== 'dueno' || !petId) return;
		const c = new AbortController();
		(async () => {
			try {
				setLoading(true);
				const data = await getPet(petId, c.signal);
				setPet(data.pet || null);
			} catch (err) {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setError(err.response?.data?.message || 'No se pudo cargar la mascota.');
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
		return <Navigate to='/login' replace state={{ from: `/mascotas/${petId}` }} />;
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

	if (error || !pet) {
		return (
			<div className='page'>
				<Link className='back-link' to='/mascotas'>
					Volver
				</Link>
				<p className='error'>{error || 'No encontrada.'}</p>
			</div>
		);
	}

	const id = String(pet._id || petId);

	async function onMarkDeceased() {
		if (!window.confirm('¿Marcar esta mascota como fallecida? La ficha dejará de ser editable.')) return;
		setMsg('');
		try {
			await markPetDeceased(id);
			setMsg('Registro actualizado.');
			const data = await getPet(id);
			setPet(data.pet);
		} catch (err) {
			setError(err.response?.data?.message || 'No se pudo actualizar.');
		}
	}

	return (
		<div className='page'>
			<Link className='back-link' to='/mascotas'>
				Mis mascotas
			</Link>
			<h1>{pet.name}</h1>
			<div className='pet-detail-head'>
				<PetPhoto petId={id} alt={pet.name} className='pet-detail-photo' />
				<div>
					<p>
						<strong>Especie:</strong> {pet.species}
					</p>
					<p>
						<strong>Sexo:</strong> {pet.sex}
					</p>
					{pet.breed ? (
						<p>
							<strong>Raza:</strong> {pet.breed}
						</p>
					) : null}
					<p>
						<strong>Estado:</strong> {pet.status === 'deceased' ? 'Fallecida' : 'Activa'}
					</p>
				</div>
			</div>
			<p>
				<Link to={`/mascotas/${id}/ficha`}>Ver historial clínico y resumen</Link>
			</p>
			{pet.status === 'active' ? (
				<p>
					<Link to={`/mascotas/${id}/edit`}>Editar datos</Link>
				</p>
			) : null}
			{pet.status === 'active' ? (
				<p>
					<button type='button' className='btn-reject' onClick={onMarkDeceased}>
						Marcar como fallecida
					</button>
				</p>
			) : null}
			{msg ? <p className='review-success'>{msg}</p> : null}
		</div>
	);
}
