import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, PawPrint } from 'lucide-react';
import { forgotPassword } from '../services/authForms';
import { Button } from '@/components/ui/button';

export function ForgotPasswordPage() {
	const [email, setEmail] = useState('');
	const [message, setMessage] = useState('');
	const [resetUrl, setResetUrl] = useState('');
	const [error, setError] = useState('');
	const [submitting, setSubmitting] = useState(false);

	async function onSubmit(e) {
		e.preventDefault();
		setError('');
		setMessage('');
		setResetUrl('');
		setSubmitting(true);
		try {
			const data = await forgotPassword(email.trim());
			setMessage(data.message || 'Revisa tu correo.');
			setResetUrl(typeof data.resetUrl === 'string' ? data.resetUrl : '');
		} catch (err) {
			setError(err.response?.data?.message || 'No se pudo procesar la solicitud.');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="flex flex-col items-center justify-center min-h-[min(calc(100dvh-3.25rem),900px)] py-8 px-4">
			<div className="w-full max-w-sm flex flex-col gap-3">
				<Link
					className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline min-h-11 mb-4"
					to="/login"
				>
					← Volver al login
				</Link>
				<section
					className="w-full rounded-2xl border border-t-4 border-t-primary border-border bg-card shadow-lg px-6 py-8 sm:px-8"
					aria-labelledby="forgot-title"
				>
					<div className="flex items-center gap-2 mb-2">
						<PawPrint className="size-4 text-primary" aria-hidden="true" />
						<span className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70">
							Acceso
						</span>
					</div>
					<h1
						id="forgot-title"
						className="text-[clamp(1.4rem,2.5vw,1.75rem)] font-bold tracking-tight text-foreground mb-1.5"
					>
						Recuperar contraseña
					</h1>
					<p className="text-sm text-muted-foreground mb-6">
						Te enviaremos un enlace para restablecerla. Revisa también tu carpeta de spam.
					</p>
					<form className="flex flex-col gap-4" onSubmit={onSubmit}>
						<div className="flex flex-col gap-1.5">
							<label htmlFor="forgot-email" className="text-sm font-semibold text-foreground">
								Correo electrónico
							</label>
							<div className="relative">
								<Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
								<input
									id="forgot-email"
									className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
								/>
							</div>
						</div>

						{message ? (
							<div
								className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-3 text-sm text-emerald-700 dark:text-emerald-400"
								role="status"
								aria-live="polite"
							>
								<p>{message}</p>
								{resetUrl ? (
									<a
										href={resetUrl}
										className="inline-block mt-2 font-semibold text-primary hover:underline break-all"
									>
										Abrir enlace de recuperación
									</a>
								) : null}
							</div>
						) : null}

						{error ? (
							<p
								className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
								role="alert"
								aria-live="assertive"
							>
								{error}
							</p>
						) : null}

						<Button
							type="submit"
							className="h-11 w-full rounded-xl font-bold"
							disabled={submitting}
						>
							{submitting ? 'Enviando…' : 'Enviar instrucciones'}
						</Button>

						<p className="text-sm text-center text-muted-foreground">
							¿Recuerdas tu contraseña?{' '}
							<Link to="/login" className="text-sm text-primary font-semibold hover:underline">
								Iniciar sesión
							</Link>
						</p>
					</form>
				</section>
			</div>
		</div>
	);
}
