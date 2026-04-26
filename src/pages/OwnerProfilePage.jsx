import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
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
			<div className="w-full">
				<div className="rounded-2xl border border-border bg-card shadow-sm p-6" role="status" aria-live="polite">
					<p className="text-muted-foreground m-0 animate-pulse">Cargando…</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return <Navigate to='/login' replace state={{ from: '/cuenta/perfil' }} />;
	}

	if (!hasRole(user, 'dueno')) {
		return (
			<div className="w-full">
				<div className="rounded-2xl border border-border bg-card shadow-sm p-6">
					<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive m-0" role="alert">
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
		<div className="w-full flex flex-col gap-5">
			<div className="rounded-2xl border border-border bg-card shadow-sm">
				<div className="px-5 py-4 border-b border-border bg-gradient-to-r from-muted/40 to-transparent dark:from-muted/20">
					<p className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70 mb-0.5">Cuenta</p>
					<h1 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold tracking-tight text-foreground">Mi perfil</h1>
				</div>
				<div className="p-5 sm:p-6">
					<div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start">
						<div className="relative w-24 h-24 shrink-0">
							{img ? (
								<img src={img} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-background shadow-md" />
							) : (
								<div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary border-4 border-background shadow-md">
									{(user.name?.[0] || '').toUpperCase()}
								</div>
							)}
							<label htmlFor="photo-input" className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-md hover:bg-primary/90 transition-colors">
								<Camera size={14} aria-hidden />
								<span className="sr-only">Cambiar foto</span>
							</label>
							<input id="photo-input" className="hidden" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
						</div>
						<div className="w-full text-center sm:text-left">
							<p className="text-muted-foreground text-[0.95rem] m-0">
								Datos de contacto y foto. Se usan en reservas y comprobantes.
							</p>
							{photo ? (
								<p className="text-[0.82rem] text-primary mt-1.5 m-0">Nueva foto: {photo.name}</p>
							) : null}
						</div>
					</div>
				</div>
			</div>

			<div className="rounded-2xl border border-border bg-card shadow-sm">
				<div className="px-5 py-4 border-b border-border bg-gradient-to-r from-muted/40 to-transparent dark:from-muted/20">
					<h2 className="text-base font-bold text-foreground">Información personal</h2>
				</div>
				<form className="p-5 sm:p-6 flex flex-col gap-4" onSubmit={onSubmit}>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="flex flex-col gap-1.5">
							<label htmlFor="f-name" className="text-sm font-semibold text-foreground">Nombre</label>
							<input
								id="f-name"
								className="h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<label htmlFor="f-lastName" className="text-sm font-semibold text-foreground">Apellido</label>
							<input
								id="f-lastName"
								className="h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
								value={lastName}
								onChange={(e) => setLastName(e.target.value)}
								required
							/>
						</div>
					</div>
					<div className="flex flex-col gap-1.5">
						<label htmlFor="f-phone" className="text-sm font-semibold text-foreground">Teléfono</label>
						<input
							id="f-phone"
							className="h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
						/>
					</div>
					{error ? (
						<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive m-0" role="alert" aria-live="assertive">
							{error}
						</p>
					) : null}
					{msg ? (
						<p className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-3 text-sm text-emerald-700 dark:text-emerald-400 m-0">
							{msg}
						</p>
					) : null}
					<div className="flex items-center justify-end pt-1">
						<button
							type="submit"
							className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
							disabled={saving}
						>
							{saving ? 'Guardando…' : 'Guardar cambios'}
						</button>
					</div>
				</form>
			</div>

			{hasRole(user, 'dueno') && !hasRole(user, 'proveedor') ? (
				<div className="rounded-2xl border border-dashed border-border bg-muted/20 dark:bg-muted/5 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
					<div>
						<p className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70 mb-0.5">Proveedor</p>
						<p className="text-sm font-semibold text-foreground m-0">¿Quieres ofrecer servicios?</p>
						<p className="text-[0.85rem] text-muted-foreground m-0 mt-0.5">
							Paseo, cuidado o veterinaria. Requiere aprobación del equipo.
						</p>
					</div>
					<Link
						to="/cuenta/ofrecer-servicios"
						className="inline-flex h-11 items-center justify-center rounded-xl border-2 border-border bg-background px-6 font-semibold text-foreground hover:bg-muted transition-colors shrink-0"
					>
						Solicitar acceso
					</Link>
				</div>
			) : null}
		</div>
	);
}
