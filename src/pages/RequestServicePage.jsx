import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
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
			<div className='page'>
				<p>Cargando…</p>
			</div>
		);
	}

	if (!providerId) {
		return (
			<div className='page'>
				<Link className='back-link' to='/'>
					Volver al mapa
				</Link>
				<p className='error'>Falta providerId en la URL.</p>
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

	if (user.role !== 'dueno') {
		return (
			<div className='page'>
				<Link className='back-link' to='/'>
					Volver al mapa
				</Link>
				<p className='error'>
					Tu cuenta es de tipo «{user.role}». Solo dueños pueden usar solicitar servicio.
				</p>
			</div>
		);
	}

	const profileLink = provider ? getProviderProfilePath(provider) : null;

	return (
		<div className='page request-service-page'>
			<Link className='back-link' to='/'>
				Volver al mapa
			</Link>
			<h1>Solicitar servicio</h1>

			{loadError ? <p className='error'>{loadError}</p> : null}
			{provider ? (
				<p>
					Proveedor:{' '}
					<strong>
						{provider.name} {provider.lastName}
					</strong>{' '}
					({provider.providerType})
					{profileLink ? (
						<>
							{' · '}
							<Link to={profileLink}>Ver perfil</Link>
						</>
					) : null}
				</p>
			) : !loadError ? (
				<p>Cargando datos del proveedor…</p>
			) : null}

			<form className='request-service-form' onSubmit={onSubmit}>
				<label className='edit-field'>
					<span>Nombre de la mascota</span>
					<input value={petName} onChange={(e) => setPetName(e.target.value)} required />
				</label>
				<label className='edit-field'>
					<span>Especie</span>
					<input value={species} onChange={(e) => setSpecies(e.target.value)} required placeholder='perro, gato…' />
				</label>
				<label className='edit-field'>
					<span>Mensaje (opcional)</span>
					<textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} />
				</label>
				<div className='edit-row-2'>
					<label className='edit-field'>
						<span>Inicio preferido</span>
						<input
							type='datetime-local'
							value={startLocal}
							onChange={(e) => setStartLocal(e.target.value)}
							required
						/>
					</label>
					<label className='edit-field'>
						<span>Término preferido</span>
						<input
							type='datetime-local'
							value={endLocal}
							onChange={(e) => setEndLocal(e.target.value)}
							required
						/>
					</label>
				</div>
				<button type='submit' className='save-profile-btn' disabled={submitting || !provider}>
					{submitting ? 'Enviando…' : 'Enviar solicitud'}
				</button>
				{submitOk ? <p className='review-success'>{submitOk}</p> : null}
				{submitError ? <p className='error'>{submitError}</p> : null}
			</form>
		</div>
	);
}
