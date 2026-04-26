import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../lib/userRoles';
import {
	fetchProviderPublicProfile,
	getProviderProfilePath,
	requestWalkerService
} from '../services/providers';

function defaultDatetimeRange() {
	const start = new Date();
	start.setDate(start.getDate() + 1);
	start.setHours(10, 0, 0, 0);
	const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
	return { start, end };
}

function toDatetimeLocalValue(d) {
	const pad = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RequestServicePage() {
	const { user, loading: authLoading } = useAuth();
	const [searchParams] = useSearchParams();
	const providerId = searchParams.get('providerId');

	const [provider, setProvider] = useState(null);
	const [loadError, setLoadError] = useState('');
	const [petName, setPetName] = useState('');
	const [species, setSpecies] = useState('perro');
	const [message, setMessage] = useState('');
	const [startLocal, setStartLocal] = useState('');
	const [endLocal, setEndLocal] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState('');
	const [submitOk, setSubmitOk] = useState('');

	const defaults = useMemo(() => defaultDatetimeRange(), []);

	useEffect(() => {
		setStartLocal(toDatetimeLocalValue(defaults.start));
		setEndLocal(toDatetimeLocalValue(defaults.end));
	}, [defaults]);

	useEffect(() => {
		if (!providerId) return;
		const c = new AbortController();
		(async () => {
			try {
				setLoadError('');
				const data = await fetchProviderPublicProfile(providerId, c.signal);
				setProvider(data.proveedor || null);
			} catch (err) {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setLoadError(err.response?.data?.message || 'No se pudo cargar el proveedor.');
				setProvider(null);
			}
		})();
		return () => c.abort();
	}, [providerId]);

	const onSubmit = useCallback(
		async (e) => {
			e.preventDefault();
			setSubmitError('');
			setSubmitOk('');
			setSubmitting(true);
			try {
				const res = await requestWalkerService({
					providerId,
					pet: { name: petName.trim(), species: species.trim() },
					message: message.trim(),
					preferredStart: new Date(startLocal).toISOString(),
					preferredEnd: new Date(endLocal).toISOString()
				});
				setSubmitOk(res.message || 'Solicitud enviada.');
			} catch (err) {
				setSubmitError(err.response?.data?.message || 'No se pudo registrar la solicitud.');
			} finally {
				setSubmitting(false);
			}
		},
		[providerId, petName, species, message, startLocal, endLocal]
	);

	if (authLoading) {
		return (
			<div className='mx-auto w-full max-w-[1200px] px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]'>
				<p>Cargando…</p>
			</div>
		);
	}

	if (!providerId) {
		return (
			<div className='mx-auto w-full max-w-[1200px] px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]'>
				<Link
					className='inline-flex items-center gap-0.5 min-h-11 mb-2 px-0.5 py-0.5 text-primary font-semibold rounded-sm hover:text-primary/80 hover:underline'
					to='/'
				>
					Volver al mapa
				</Link>
				<p className='rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive mb-3'>
					Falta providerId en la URL.
				</p>
			</div>
		);
	}

	if (!user) {
		return (
			<Navigate
				to='/login'
				replace
				state={{ from: `/solicitar-servicio?providerId=${encodeURIComponent(providerId)}` }}
			/>
		);
	}

	if (!hasRole(user, 'dueno')) {
		return (
			<div className='mx-auto w-full max-w-[1200px] px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]'>
				<Link
					className='inline-flex items-center gap-0.5 min-h-11 mb-2 px-0.5 py-0.5 text-primary font-semibold rounded-sm hover:text-primary/80 hover:underline'
					to='/'
				>
					Volver al mapa
				</Link>
				<p className='rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive mb-3'>
					Necesitas una cuenta con rol de dueño (incluye cuentas que también son proveedor). Tu sesión actual no
					tiene permiso para solicitar servicio aquí.
				</p>
			</div>
		);
	}

	const profileLink = provider ? getProviderProfilePath(provider) : null;

	const inputCls = 'h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors font-[inherit]';
	const fieldCls = 'flex flex-col gap-1.5 text-sm';

	return (
		<div className='mx-auto w-full max-w-[600px] px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))]'>
			<Link
				className='inline-flex items-center gap-0.5 min-h-11 mb-3 px-0.5 py-0.5 text-primary font-semibold rounded-sm hover:text-primary/80 hover:underline'
				to='/'
			>
				← Volver al mapa
			</Link>

			<div className='rounded-2xl border border-border bg-card shadow-sm overflow-hidden'>
				<div className='px-5 py-4 border-b border-border bg-gradient-to-r from-muted/40 to-transparent dark:from-muted/20'>
					<p className='text-[0.7rem] font-bold uppercase tracking-widest text-primary/70 mb-0.5'>Reserva</p>
					<h1 className='text-[clamp(1.25rem,2.4vw,1.5rem)] font-bold tracking-tight text-foreground'>
						Solicitar servicio
					</h1>
				</div>

				<div className='p-5 flex flex-col gap-4'>
					{loadError ? (
						<p className='rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive'>
							{loadError}
						</p>
					) : null}

					{provider ? (
						<div className='rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center justify-between gap-3'>
							<div>
								<p className='text-[0.72rem] font-bold uppercase tracking-widest text-muted-foreground mb-0.5'>Proveedor</p>
								<p className='font-semibold text-foreground text-sm'>
									{provider.name} {provider.lastName}
									<span className='text-muted-foreground font-normal ml-1.5 capitalize'>({provider.providerType})</span>
								</p>
							</div>
							{profileLink ? (
								<Link to={profileLink} className='inline-flex h-8 items-center px-3 rounded-lg border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors shrink-0'>
									Ver perfil
								</Link>
							) : null}
						</div>
					) : !loadError ? (
						<div className='flex items-center gap-2 text-muted-foreground text-sm py-2'>
							<div className='w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin' />
							Cargando datos del proveedor…
						</div>
					) : null}

					<form className='flex flex-col gap-4' onSubmit={onSubmit}>
						<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
							<label className={fieldCls}>
								<span className='font-medium'>Nombre de la mascota</span>
								<input
									className={inputCls}
									value={petName}
									onChange={(e) => setPetName(e.target.value)}
									required
									placeholder='Ej. Firulais'
								/>
							</label>
							<label className={fieldCls}>
								<span className='font-medium'>Especie</span>
								<input
									className={inputCls}
									value={species}
									onChange={(e) => setSpecies(e.target.value)}
									required
									placeholder='perro, gato…'
								/>
							</label>
						</div>
						<label className={fieldCls}>
							<span className='font-medium'>Mensaje (opcional)</span>
							<textarea
								className='w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors'
								rows={3}
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								maxLength={500}
								placeholder='Cuéntale al proveedor sobre tu mascota o necesidades…'
							/>
						</label>
						<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
							<label className={fieldCls}>
								<span className='font-medium'>Inicio preferido</span>
								<input
									className={inputCls}
									type='datetime-local'
									value={startLocal}
									onChange={(e) => setStartLocal(e.target.value)}
									required
								/>
							</label>
							<label className={fieldCls}>
								<span className='font-medium'>Término preferido</span>
								<input
									className={inputCls}
									type='datetime-local'
									value={endLocal}
									onChange={(e) => setEndLocal(e.target.value)}
									required
								/>
							</label>
						</div>

						{submitOk ? (
							<p className='text-sm font-semibold text-emerald-700 dark:text-emerald-400'>{submitOk}</p>
						) : null}
						{submitError ? (
							<p className='rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive'>
								{submitError}
							</p>
						) : null}

						<button
							type='submit'
							className='inline-flex h-11 w-full items-center justify-center rounded-xl border-0 bg-primary px-5 text-sm font-bold text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors disabled:opacity-65 disabled:cursor-not-allowed'
							disabled={submitting || !provider}
						>
							{submitting ? 'Enviando solicitud…' : 'Enviar solicitud'}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
