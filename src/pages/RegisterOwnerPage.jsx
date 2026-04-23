import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
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
		<div className='page auth-page'>
			<Link className='back-link' to='/'>
				Volver al mapa
			</Link>
			<section className='auth-card'>
				<h1>Crear cuenta dueño</h1>
				<form className='auth-form' onSubmit={onSubmit}>
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
					{error ? <p className='error'>{error}</p> : null}
					<div className='auth-footer-links'>
						<p className='muted' style={{ margin: 0 }}>
							¿Ya tienes cuenta? <Link to='/login'>Iniciar sesión</Link>
						</p>
						<p className='muted' style={{ margin: '10px 0 0' }}>
							¿Ofreces servicio veterinario, paseo o cuidado?{' '}
							<Link to='/registro-proveedor'>Alta de proveedores</Link>
						</p>
					</div>
				</form>
			</section>
		</div>
	);
}
