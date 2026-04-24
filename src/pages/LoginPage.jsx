import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AuthModeSwitch } from '../components/AuthModeSwitch';

export function LoginPage() {
	const { login } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [submitting, setSubmitting] = useState(false);

	async function onSubmit(e) {
		e.preventDefault();
		setError('');
		setSubmitting(true);
		try {
			await login(email, password);
			const dest = location.state?.from;
			const path = typeof dest === 'string' ? dest : dest?.pathname || '/';
			navigate(path, { replace: true });
		} catch (err) {
			setError(err.response?.data?.message || 'No se pudo iniciar sesión.');
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
				<section className="auth-card" aria-labelledby="login-title">
					<div className="auth-card-eyebrow">PetConnect</div>
					<h1 id="login-title">Iniciar sesión</h1>
					<p className="muted auth-card-lead">Entra con tu correo y contraseña para reservar y cuidar la ficha de tu mascota.</p>
					<form className="auth-form" onSubmit={onSubmit}>
						<label className="auth-field">
							<span>Correo</span>
							<input
								type="email"
								autoComplete="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</label>
						<label className="auth-field">
							<span>Contraseña</span>
							<input
								type="password"
								autoComplete="current-password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
							/>
						</label>
						<button type="submit" className="auth-submit" disabled={submitting}>
							{submitting ? 'Entrando…' : 'Entrar'}
						</button>
						{error ? (
							<p className="error" role="alert" aria-live="assertive">
								{error}
							</p>
						) : null}
						<AuthModeSwitch mode="login" />
						<div className="auth-footer-links" style={{ borderTop: 'none', marginTop: 0, paddingTop: '0.5rem' }}>
							<p className="muted" style={{ margin: 0 }}>
								<Link to="/recuperar-clave">Olvidé mi contraseña</Link>
							</p>
						</div>
					</form>
				</section>
			</div>
		</div>
	);
}
