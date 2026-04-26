import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, PawPrint } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { AuthModeSwitch } from '../components/AuthModeSwitch';
import { setStoredAuthToken } from '../services/api';
import { registerOwner } from '../services/authForms';
import { Button } from '@/components/ui/button';

export function RegisterOwnerPage() {
	const { refreshUser } = useAuth();
	const navigate = useNavigate();
	const [name, setName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
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
		<div className="flex flex-col items-center justify-center min-h-[min(calc(100dvh-3.25rem),900px)] py-8 px-4">
			<div className="w-full max-w-sm flex flex-col gap-3">
				<Link
					className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline min-h-11 mb-4"
					to="/"
				>
					← Volver al mapa
				</Link>
				<section
					className="w-full rounded-2xl border border-t-4 border-t-primary border-border bg-card shadow-lg px-6 py-8 sm:px-8"
					aria-labelledby="reg-owner-title"
				>
					<div className="flex items-center gap-2 mb-2">
						<PawPrint className="size-4 text-primary" aria-hidden="true" />
						<span className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70">
							Nueva cuenta
						</span>
					</div>
					<h1
						id="reg-owner-title"
						className="text-[clamp(1.4rem,2.5vw,1.75rem)] font-bold tracking-tight text-foreground mb-1.5"
					>
						Crear cuenta dueño
					</h1>
					<p className="text-sm text-muted-foreground mb-6">
						Regístrate para reservar citas y guardar el historial de salud de tus mascotas.
					</p>
					<form className="flex flex-col gap-4" onSubmit={onSubmit}>
						<div className="flex flex-col gap-1.5">
							<label htmlFor="reg-name" className="text-sm font-semibold text-foreground">
								Nombre
							</label>
							<input
								id="reg-name"
								className="h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<label htmlFor="reg-lastName" className="text-sm font-semibold text-foreground">
								Apellido
							</label>
							<input
								id="reg-lastName"
								className="h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
								value={lastName}
								onChange={(e) => setLastName(e.target.value)}
								required
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<label htmlFor="reg-email" className="text-sm font-semibold text-foreground">
								Correo
							</label>
							<input
								id="reg-email"
								className="h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<label htmlFor="reg-phone" className="text-sm font-semibold text-foreground">
								Teléfono{' '}
								<span className="font-normal text-muted-foreground">(opcional)</span>
							</label>
							<input
								id="reg-phone"
								className="h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<label htmlFor="reg-password" className="text-sm font-semibold text-foreground">
								Contraseña
							</label>
							<div className="relative">
								<input
									id="reg-password"
									className="h-11 w-full rounded-xl border border-input bg-background px-3 py-2 pr-10 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
									type={showPassword ? 'text' : 'password'}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
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
							{submitting ? 'Creando…' : 'Registrarme'}
						</Button>

						<div className="relative my-1 flex items-center gap-3 before:flex-1 before:border-t before:border-border after:flex-1 after:border-t after:border-border">
							<span className="text-xs text-muted-foreground">o</span>
						</div>

						<AuthModeSwitch mode="register" />

						<p className="text-sm text-muted-foreground text-center">
							¿Ofreces servicios veterinarios, paseo o cuidado?{' '}
							<Link to="/registro-proveedor" className="text-sm text-primary font-semibold hover:underline">
								Alta de proveedores
							</Link>
						</p>
					</form>
				</section>
			</div>
		</div>
	);
}
