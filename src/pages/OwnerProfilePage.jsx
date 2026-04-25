import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../lib/userRoles';
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
		if (user && hasRole(user, 'dueno')) {
			setName(user.name || '');
			setLastName(user.lastName || '');
			setPhone(user.phone || '');
		}
	}, [user]);

	if (loading) {
		return (
			<div className="page">
				<div className="page-surface" role="status" aria-live="polite">
					<p className="muted" style={{ margin: 0 }}>
						Cargando…
					</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return <Navigate to='/login' replace state={{ from: '/cuenta/perfil' }} />;
	}

	if (!hasRole(user, 'dueno')) {
		return (
			<div className="page">
				<Link className="back-link" to="/">
					← Inicio
				</Link>
				<div className="page-surface">
					<p className="error" style={{ margin: 0 }} role="alert">
						Esta sección es para cuentas con rol de dueño. Los proveedores usan «Editar perfil» en el panel.
					</p>
				</div>
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
		<div className="owner-hub-section provider-edit-page">
			<div className="page-surface page-surface--wide">
			<header className="page-hero" style={{ marginBottom: '0.5rem' }}>
				<h1>Mi perfil</h1>
				<p>Datos de contacto y foto. Úsalo en reservas y comprobantes.</p>
			</header>
			{hasRole(user, 'dueno') && !hasRole(user, 'proveedor') ? (
				<p className="hint muted" style={{ margin: '0 0 0.75rem' }}>
					<strong>¿Quieres ofrecer servicios con el mismo correo?</strong>{' '}
					<Link to="/cuenta/ofrecer-servicios">Solicitar ser proveedor</Link> (paseo, cuidado o
					veterinaria; requiere aprobación).
				</p>
			) : null}
			{img ? (
				<p>
					<img src={img} alt="" className="owner-profile-img" />
				</p>
			) : null}
			<form className="edit-fieldset" onSubmit={onSubmit}>
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
				{error ? <p className="error" role="alert" aria-live="assertive">{error}</p> : null}
				{msg ? <p className="review-success">{msg}</p> : null}
				<button type="submit" className="save-profile-btn" disabled={saving}>
					{saving ? 'Guardando…' : 'Guardar'}
				</button>
			</form>
			</div>
		</div>
	);
}
