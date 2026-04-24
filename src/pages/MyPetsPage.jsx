import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { OwnerSubnav } from '../components/OwnerSubnav';
import { useAuth } from '../hooks/useAuth';
import { listPets } from '../services/pets';
import { PetPhoto } from '../components/PetPhoto';

export function MyPetsPage() {
	const { user, loading: authLoading } = useAuth();
	const [pets, setPets] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		if (authLoading || !user || user.role !== 'dueno') return;
		const c = new AbortController();
		(async () => {
			try {
				setLoading(true);
				setError('');
				const data = await listPets({}, c.signal);
				setPets(Array.isArray(data.pets) ? data.pets : []);
			} catch (err) {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setError(err.response?.data?.message || 'No se pudieron cargar las mascotas.');
			} finally {
				setLoading(false);
			}
		})();
		return () => c.abort();
	}, [authLoading, user]);

	if (authLoading) {
		return (
			<div className="page">
				<div className="page-surface" role="status" aria-live="polite">
					<p className="muted" style={{ margin: 0 }}>
						Cargando…
					</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return <Navigate to='/login' replace state={{ from: '/mascotas' }} />;
	}

	if (user.role !== 'dueno') {
		return (
			<div className="page">
				<Link className="back-link" to="/">
					← Inicio
				</Link>
				<div className="page-surface">
					<p className="error" style={{ margin: 0 }} role="alert">
						Las mascotas están disponibles para cuentas de dueño.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="page pets-page">
			<Link className="back-link" to="/">
				← Volver al mapa
			</Link>
			<div className="page-surface page-surface--wide">
			<header className="pets-page-header">
				<div className="pets-page-header-text">
					<h1>Mis mascotas</h1>
					<p className="muted">Registra fichas para agendar en veterinarias y llevar historial clínico.</p>
				</div>
				<Link className="pets-register-cta" to="/mascotas/nueva">
					Registrar mascota
				</Link>
			</header>
			<OwnerSubnav />

			{loading ? <p className="muted">Cargando…</p> : null}
			{error ? <p className="error" role="alert" aria-live="assertive">{error}</p> : null}

			{!loading && pets.length === 0 ? <p className="muted">Aún no tienes mascotas registradas.</p> : null}

			<ul className="pets-list">
				{pets.map((p) => {
					const id = String(p._id || p.id);
					return (
						<li key={id} className='pets-list-item pets-list-card'>
							<PetPhoto petId={id} alt={p.name} />
							<div>
								<strong>{p.name}</strong>
								<span className='muted'>
									{' '}
									· {p.species} · {p.status === 'deceased' ? 'fallecida' : 'activa'}
								</span>
								<div className='pets-list-actions'>
									<Link to={`/mascotas/${id}`}>Ver ficha</Link>
									{p.status === 'active' ? (
										<>
											{' · '}
											<Link to={`/mascotas/${id}/edit`}>Editar</Link>
											{' · '}
											<Link to={`/mascotas/${id}/ficha`}>Historial clínico</Link>
										</>
									) : null}
								</div>
							</div>
						</li>
					);
				})}
			</ul>
			</div>
		</div>
	);
}
