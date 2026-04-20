import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { listMisCitas, listProximasCitas } from '../services/citas';

export function CitasLegacyPage() {
	const { user, loading: authLoading } = useAuth();
	const [proximas, setProximas] = useState([]);
	const [todas, setTodas] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [tab, setTab] = useState('proximas');

	useEffect(() => {
		if (authLoading || !user || user.role !== 'dueno') return;
		const c = new AbortController();
		(async () => {
			try {
				setLoading(true);
				const [p, t] = await Promise.all([
					listProximasCitas(c.signal),
					listMisCitas({}, c.signal)
				]);
				setProximas(Array.isArray(p.citas) ? p.citas : []);
				setTodas(Array.isArray(t.citas) ? t.citas : []);
			} catch (err) {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setError(err.response?.data?.message || 'Error al cargar citas.');
			} finally {
				setLoading(false);
			}
		})();
		return () => c.abort();
	}, [authLoading, user]);

	if (authLoading || loading) {
		return (
			<div className='page'>
				<p>Cargando…</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to='/login' replace state={{ from: '/citas' }} />;
	}

	if (user.role !== 'dueno') {
		return (
			<div className='page'>
				<Link className='back-link' to='/'>
					Inicio
				</Link>
				<p className='error'>Solo dueños.</p>
			</div>
		);
	}

	const rows = tab === 'proximas' ? proximas : todas;

	return (
		<div className='page'>
			<Link className='back-link' to='/mis-reservas'>
				Mis reservas (unificado)
			</Link>
			<h1>Citas (modelo legacy)</h1>
			<p className='muted'>GET /api/citas/proximas y /api/citas/mis-citas</p>
			{error ? <p className='error'>{error}</p> : null}
			<p>
				<button type='button' className={tab === 'proximas' ? 'save-profile-btn' : 'btn-sm'} onClick={() => setTab('proximas')}>
					Próximas
				</button>{' '}
				<button type='button' className={tab === 'todas' ? 'save-profile-btn' : 'btn-sm'} onClick={() => setTab('todas')}>
					Todas
				</button>
			</p>
			<ul className='citas-legacy-list'>
				{rows.map((c) => (
					<li key={String(c._id)}>
						<strong>{c.servicio}</strong> · {c.estado} ·{' '}
						{new Date(c.fecha).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}
						{c.proveedor ? (
							<span className='muted'>
								{' '}
								· {c.proveedor.name} {c.proveedor.lastName}
							</span>
						) : null}
					</li>
				))}
			</ul>
			{rows.length === 0 ? <p className='muted'>Sin registros.</p> : null}
		</div>
	);
}
