import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { resolveBackendAssetUrl } from '../services/api';
import { updateMyProfile } from '../services/profile';

export function OwnerProfilePage() {
	const { user, loading, refreshUser } = useAuth();
	const [name, setName] = useState('');
	const [lastName, setLastName] = useState('');
	const [phone, setPhone] = useState('');
	const [photo, setPhoto] = useState(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [msg, setMsg] = useState('');

	useEffect(() => {
		if (user && user.role === 'dueno') {
			setName(user.name || '');
			setLastName(user.lastName || '');
			setPhone(user.phone || '');
		}
	}, [user]);

	if (loading) {
		return (
			<div className='page'>
				<p>Cargando…</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to='/login' replace state={{ from: '/mi-perfil' }} />;
	}

	if (user.role !== 'dueno') {
		return (
			<div className='page'>
				<Link className='back-link' to='/'>
					Inicio
				</Link>
				<p className='error'>Esta sección es para dueños. Los proveedores usan «Editar perfil» en el panel.</p>
			</div>
		);
	}

	async function onSubmit(e) {
		e.preventDefault();
		setError('');
		setMsg('');
		setSaving(true);
		try {
			await updateMyProfile({
				name: name.trim(),
				lastName: lastName.trim(),
				phone: phone.trim(),
				profileImageFile: photo || undefined
			});
			setMsg('Perfil actualizado.');
			setPhoto(null);
			await refreshUser();
		} catch (err) {
			setError(err.response?.data?.message || 'No se pudo guardar.');
		} finally {
			setSaving(false);
		}
	}

	const img = user.profileImage ? resolveBackendAssetUrl(user.profileImage) : null;

	return (
		<div className='page provider-edit-page'>
			<Link className='back-link' to='/'>
				Inicio
			</Link>
			<h1>Mi perfil</h1>
			{img ? (
				<p>
					<img src={img} alt='' className='owner-profile-img' />
				</p>
			) : null}
			<form className='edit-fieldset' onSubmit={onSubmit}>
				<label className='edit-field'>
					<span>Nombre</span>
					<input value={name} onChange={(e) => setName(e.target.value)} required />
				</label>
				<label className='edit-field'>
					<span>Apellido</span>
					<input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
				</label>
				<label className='edit-field'>
					<span>Teléfono</span>
					<input value={phone} onChange={(e) => setPhone(e.target.value)} />
				</label>
				<label className='edit-field'>
					<span>Foto de perfil (opcional)</span>
					<input type='file' accept='image/*' onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
				</label>
				{error ? <p className='error'>{error}</p> : null}
				{msg ? <p className='review-success'>{msg}</p> : null}
				<button type='submit' className='save-profile-btn' disabled={saving}>
					{saving ? 'Guardando…' : 'Guardar'}
				</button>
			</form>
		</div>
	);
}
