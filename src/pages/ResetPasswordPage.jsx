import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../services/authForms';

export function ResetPasswordPage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const token = searchParams.get('token') || '';
	const email = searchParams.get('email') || '';

	const [newPassword, setNewPassword] = useState('');
	const [message, setMessage] = useState('');
	const [error, setError] = useState('');
	const [submitting, setSubmitting] = useState(false);

	const missingParams = useMemo(() => !token || !email, [token, email]);

	async function onSubmit(e) {
		e.preventDefault();
		setError('');
		setMessage('');
		setSubmitting(true);
		try {
			await resetPassword({ email: email.trim(), token, newPassword });
			setMessage('Contraseña actualizada. Ya puedes iniciar sesión.');
			setTimeout(() => navigate('/login', { replace: true }), 1500);
		} catch (err) {
			setError(err.response?.data?.message || 'No se pudo restablecer la contraseña.');
		} finally {
			setSubmitting(false);
		}
	}

	if (missingParams) {
		return (
			<div className='page auth-page'>
				<Link className='back-link' to='/login'>
					Volver al login
				</Link>
				<p className='error'>Enlace incompleto. Solicita un nuevo correo de recuperación.</p>
			</div>
		);
	}

	return (
		<div className='page auth-page'>
			<Link className='back-link' to='/login'>
				Volver al login
			</Link>
			<section className='auth-card'>
				<h1>Nueva contraseña</h1>
				<p className='muted'>{email}</p>
				<form className='auth-form' onSubmit={onSubmit}>
					<label className='auth-field'>
						<span>Nueva contraseña</span>
						<input
							type='password'
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							required
							minLength={6}
						/>
					</label>
					<button type='submit' className='auth-submit' disabled={submitting}>
						{submitting ? 'Guardando…' : 'Guardar'}
					</button>
					{message ? <p className='review-success'>{message}</p> : null}
					{error ? <p className='error'>{error}</p> : null}
				</form>
			</section>
		</div>
	);
}
