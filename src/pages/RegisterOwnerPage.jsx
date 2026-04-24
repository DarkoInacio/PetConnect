import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AuthModeSwitch } from '../components/AuthModeSwitch';
import { setStoredAuthToken } from '../services/api';
import { registerOwner } from '../services/authForms';

export function RegisterOwnerPage() {
	const { refreshUser } = useAuth();
	const navigate = useNavigate();
	const [name, setName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [phone, setPhone] = useState('');
	const [error, setError] = useState('');
	const [submitting, setSubmitting] = useState(false);

	async function onSubmit(e) {
		e.preventDefault();
		setError('');
		setSubmitting(true);
		try {
			const data = await registerOwner({
				name,
				lastName,
				email,
				password,
				phone: phone.trim() || undefined,
				role: 'dueno'
			});
			setStoredAuthToken(data.token);
			await refreshUser();
			navigate('/', { replace: true });
		} catch (err) {
			setError(err.response?.data?.message || 'No se pudo registrar.');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="page auth-page">
			<div className="auth-page-stack">
				<Link className="back-link" to="/">
					← Volver al mapa
				</Link>
				<section className="auth-card" aria-labelledby="reg-owner-title">
					<div className="auth-card-eyebrow">Nueva cuenta</div>
					<h1 id="reg-owner-title">Crear cuenta dueño</h1>
					<p className="muted auth-card-lead">Regístrate para reservar citas y guardar el historial de salud de tus mascotas.</p>
					<form className="auth-form" onSubmit={onSubmit}>
					<label className='auth-field'>
						<span>Nombre</span>
						<input value={name} onChange={(e) => setName(e.target.value)} required />
					</label>
					<label className='auth-field'>
						<span>Apellido</span>
						<input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
					</label>
					<label className='auth-field'>
						<span>Correo</span>
						<input type='email' value={email} onChange={(e) => setEmail(e.target.value)} required />
					</label>
					<label className='auth-field'>
						<span>Teléfono (opcional)</span>
						<input value={phone} onChange={(e) => setPhone(e.target.value)} />
					</label>
					<label className='auth-field'>
						<span>Contraseña</span>
						<input type='password' value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
					</label>
					<button type='submit' className='auth-submit' disabled={submitting}>
						{submitting ? 'Creando…' : 'Registrarme'}
					</button>
					{error ? (
						<p className="error" role="alert" aria-live="assertive">
							{error}
						</p>
					) : null}
					<AuthModeSwitch mode="register" />
					<div className="auth-footer-links" style={{ borderTop: 'none', marginTop: 0, paddingTop: '0.75rem' }}>
						<p className="muted" style={{ margin: 0 }}>
							¿Ofreces servicio veterinario, paseo o cuidado?{' '}
							<Link to="/registro-proveedor">Alta de proveedores</Link>
						</p>
					</div>
				</form>
			</section>
			</div>
		</div>
	);
}
