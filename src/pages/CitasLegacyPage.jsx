import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { OwnerSubnav } from '../components/OwnerSubnav';
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
				const [p, t] = await Promise.all([listProximasCitas(c.signal), listMisCitas({}, c.signal)]);
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
			<div className="page">
				<div className="page-surface" role="status" aria-live="polite">
					<p className="muted" style={{ margin: 0 }}>
						Cargando citas…
					</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace state={{ from: '/citas' }} />;
	}

	if (user.role !== 'dueno') {
		return (
			<div className="page">
				<Link className="back-link" to="/">
					← Inicio
				</Link>
				<div className="page-surface">
					<p className="error" style={{ margin: 0 }} role="alert">
						Solo dueños.
					</p>
				</div>
			</div>
		);
	}

	const rows = tab === 'proximas' ? proximas : todas;

	return (
		<div className="page">
			<Link className="back-link" to="/">
				← Volver al mapa
			</Link>
			<div className="page-surface page-surface--wide">
				<header className="page-hero">
					<h1>Citas (modelo anterior)</h1>
					<p>
						Listado heredado del sistema de citas. Las nuevas reservas por agenda aparecen también en{' '}
						<Link to="/mis-reservas">Mis reservas</Link>.
					</p>
				</header>
				<OwnerSubnav />
				{import.meta.env.DEV ? (
					<p className="muted" style={{ fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
						Desarrollo: <code>GET /api/citas/proximas</code>, <code>GET /api/citas/mis-citas</code>
					</p>
				) : null}
				{error ? (
					<p className="error" role="alert" style={{ margin: '0 0 1rem' }}>
						{error}
					</p>
				) : null}
				<div className="citas-legacy-tabs" role="tablist" aria-label="Tipo de listado de citas">
					<button
						type="button"
						role="tab"
						aria-selected={tab === 'proximas'}
						id="tab-citas-proximas"
						onClick={() => setTab('proximas')}
					>
						Próximas
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={tab === 'todas'}
						id="tab-citas-todas"
						onClick={() => setTab('todas')}
					>
						Todas
					</button>
				</div>
				<ul className="citas-legacy-list" role="tabpanel" aria-labelledby={tab === 'proximas' ? 'tab-citas-proximas' : 'tab-citas-todas'}>
					{rows.map((c) => (
						<li key={String(c._id)}>
							<strong>{c.servicio}</strong> · {c.estado} ·{' '}
							{new Date(c.fecha).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}
							{c.proveedor ? (
								<span className="muted">
									{' '}
									· {c.proveedor.name} {c.proveedor.lastName}
								</span>
							) : null}
						</li>
					))}
				</ul>
				{rows.length === 0 ? (
					<p className="muted" style={{ margin: '0.5rem 0 0' }}>
						Sin registros en este listado.
					</p>
				) : null}
			</div>
		</div>
	);
}
