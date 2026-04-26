import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, PawPrint } from 'lucide-react';
import { resetPassword } from '../services/authForms';
import { Button } from '@/components/ui/button';

export function ResetPasswordPage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const token = searchParams.get('token') || '';
	const email = searchParams.get('email') || '';

	const [newPassword, setNewPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
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
			<div className="flex flex-col items-center justify-center min-h-[min(calc(100dvh-3.25rem),900px)] py-8 px-4">
				<div className="w-full max-w-sm flex flex-col gap-3">
					<Link
						className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline min-h-11 mb-4"
						to="/login"
					>
						← Volver al login
					</Link>
					<div
						className="w-full rounded-2xl border border-t-4 border-t-primary border-border bg-card shadow-lg px-6 py-8 sm:px-8"
						role="alert"
					>
						<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive m-0">
							Enlace incompleto. Solicita un nuevo correo de recuperación.
						</p>
					</div>
				</div>
			</div>
		);
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
					aria-labelledby="reset-title"
				>
					<div className="flex items-center gap-2 mb-2">
						<PawPrint className="size-4 text-primary" aria-hidden="true" />
						<span className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70">
							Nueva clave
						</span>
					</div>
					<h1
						id="reset-title"
						className="text-[clamp(1.4rem,2.5vw,1.75rem)] font-bold tracking-tight text-foreground mb-1.5"
					>
						Nueva contraseña
					</h1>
					<p className="text-sm text-muted-foreground mb-6">
						Cuenta:{' '}
						<span className="font-semibold text-foreground">{email}</span>
					</p>
					<form className="flex flex-col gap-4" onSubmit={onSubmit}>
						<div className="flex flex-col gap-1.5">
							<label htmlFor="reset-password" className="text-sm font-semibold text-foreground">
								Nueva contraseña
							</label>
							<div className="relative">
								<input
									id="reset-password"
									className="h-11 w-full rounded-xl border border-input bg-background px-3 py-2 pr-10 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
									type={showPassword ? 'text' : 'password'}
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									required
									minLength={6}
								/>
								<button
									type="button"
									aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
									className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
									onClick={() => setShowPassword((v) => !v)}
								>
									{showPassword ? (
										<EyeOff className="size-4" aria-hidden="true" />
									) : (
										<Eye className="size-4" aria-hidden="true" />
									)}
								</button>
							</div>
						</div>

						{message ? (
							<p
								className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-3 text-sm text-emerald-700 dark:text-emerald-400"
								role="status"
								aria-live="polite"
							>
								{message}
							</p>
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
							{submitting ? 'Guardando…' : 'Guardar contraseña'}
						</Button>
					</form>
				</section>
			</div>
		</div>
	);
}
