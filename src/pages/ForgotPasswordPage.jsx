import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/authForms';

export function ForgotPasswordPage() {
	const [email, setEmail] = useState('');
	const [message, setMessage] = useState('');
	const [error, setError] = useState('');
	const [submitting, setSubmitting] = useState(false);

	async function onSubmit(e) {
		e.preventDefault();
		setError('');
		setMessage('');
		setSubmitting(true);
		try {
			const data = await forgotPassword(email.trim());
			setMessage(data.message || 'Revisa tu correo.');
		} catch (err) {
			setError(err.response?.data?.message || 'No se pudo procesar la solicitud.');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="page auth-page">
			<div className="auth-page-stack">
				<Link className="back-link" to="/login">
					← Volver al login
				</Link>
				<section className="auth-card" aria-labelledby="forgot-title">
					<div className="auth-card-eyebrow">Acceso</div>
					<h1 id="forgot-title">Recuperar contraseña</h1>
					<p className="muted auth-card-lead">Te enviaremos un enlace para restablecerla (revisa carpeta de spam).</p>
					<form className="auth-form" onSubmit={onSubmit}>
					<label className='auth-field'>
						<span>Correo</span>
						<input type='email' value={email} onChange={(e) => setEmail(e.target.value)} required />
					</label>
					<button type='submit' className='auth-submit' disabled={submitting}>
						{submitting ? 'Enviando…' : 'Enviar instrucciones'}
					</button>
					{message ? <p className="review-success">{message}</p> : null}
					{error ? (
						<p className="error" role="alert" aria-live="assertive">
							{error}
						</p>
					) : null}
					</form>
			</section>
			</div>
		</div>
	);
}
