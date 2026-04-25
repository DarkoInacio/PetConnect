import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useMatch } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PET_SPECIES, PET_SEX } from '../constants/pets';
import { createPet, getPet, updatePet } from '../services/pets';

function toInputDate(d) {
	if (!d) return '';
	try {
		const x = new Date(d);
		if (Number.isNaN(x.getTime())) return '';
		return x.toISOString().slice(0, 10);
	} catch {
		return '';
	}
}

export function PetFormPage() {
	const { user, loading: authLoading } = useAuth();
	const { petId } = useParams();
	const isNew = Boolean(useMatch('/mascotas/nueva'));
	const navigate = useNavigate();

	const [loading, setLoading] = useState(!isNew);
	const [error, setError] = useState('');
	const [name, setName] = useState('');
	const [species, setSpecies] = useState('perro');
	const [breed, setBreed] = useState('');
	const [birthDate, setBirthDate] = useState('');
	const [sex, setSex] = useState('macho');
	const [color, setColor] = useState('');
	const [foto, setFoto] = useState(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (isNew || !petId || authLoading || !user || user.role !== 'dueno') return;
		const c = new AbortController();
		(async () => {
			try {
				setLoading(true);
				const data = await getPet(petId, c.signal);
				const p = data.pet;
				if (!p) return;
				setName(p.name || '');
				setSpecies(p.species || 'perro');
				setBreed(p.breed || '');
				setBirthDate(toInputDate(p.birthDate));
				setSex(p.sex || 'macho');
				setColor(p.color || '');
			} catch (err) {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setError(err.response?.data?.message || 'No se pudo cargar la mascota.');
			} finally {
				setLoading(false);
			}
		})();
		return () => c.abort();
	}, [isNew, petId, authLoading, user]);

	if (authLoading) {
		return (
			<div className='page'>
				<p>Cargando…</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to='/login' replace state={{ from: isNew ? '/mascotas/nueva' : `/mascotas/${petId}/edit` }} />;
	}

	if (user.role !== 'dueno') {
		return (
			<div className='page'>
				<Link className='back-link' to='/'>
					Inicio
				</Link>
				<p className='error'>Solo dueños pueden gestionar mascotas.</p>
			</div>
		);
	}

	async function onSubmit(e) {
		e.preventDefault();
		setError('');
		setSaving(true);
		try {
			if (isNew) {
				await createPet({
					name: name.trim(),
					species,
					breed: breed.trim(),
					birthDate: birthDate.trim() || null,
					sex,
					color: color.trim(),
					fotoFile: foto || undefined
				});
				navigate('/cuenta/mascotas');
			} else {
				await updatePet(
					petId,
					{
						name: name.trim(),
						species,
						breed: breed.trim(),
						birthDate: birthDate.trim() || null,
						sex,
						color: color.trim()
					},
					foto || undefined
				);
				navigate(`/mascotas/${petId}`);
			}
		} catch (err) {
			setError(err.response?.data?.message || 'No se pudo guardar.');
		} finally {
			setSaving(false);
		}
	}

	if (!isNew && loading) {
		return (
			<div className='page'>
				<p>Cargando mascota…</p>
			</div>
		);
	}

	return (
		<div className='page provider-edit-page'>
			<Link className='back-link' to={isNew ? '/cuenta/mascotas' : `/mascotas/${petId}`}>
				Volver
			</Link>
			<h1>{isNew ? 'Registrar mascota' : 'Editar mascota'}</h1>

			<form className='edit-fieldset' onSubmit={onSubmit}>
				<label className='edit-field'>
					<span>Nombre</span>
					<input value={name} onChange={(e) => setName(e.target.value)} required />
				</label>
				<label className='edit-field'>
					<span>Especie</span>
					<select value={species} onChange={(e) => setSpecies(e.target.value)} required>
						{PET_SPECIES.map((o) => (
							<option key={o.value} value={o.value}>
								{o.label}
							</option>
						))}
					</select>
				</label>
				<label className='edit-field'>
					<span>Raza (opcional)</span>
					<input value={breed} onChange={(e) => setBreed(e.target.value)} />
				</label>
				<label className='edit-field'>
					<span>Sexo</span>
					<select value={sex} onChange={(e) => setSex(e.target.value)} required>
						{PET_SEX.map((o) => (
							<option key={o.value} value={o.value}>
								{o.label}
							</option>
						))}
					</select>
				</label>
				<label className='edit-field'>
					<span>Fecha de nacimiento (opcional)</span>
					<input type='date' value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
				</label>
				<label className='edit-field'>
					<span>Color (opcional)</span>
					<input value={color} onChange={(e) => setColor(e.target.value)} />
				</label>
				<label className='edit-field'>
					<span>Foto (opcional, JPG)</span>
					<input type='file' accept='image/jpeg,image/png' onChange={(e) => setFoto(e.target.files?.[0] || null)} />
				</label>
				{error ? <p className='error'>{error}</p> : null}
				<button type='submit' className='save-profile-btn' disabled={saving}>
					{saving ? 'Guardando…' : 'Guardar'}
				</button>
			</form>
		</div>
	);
}
