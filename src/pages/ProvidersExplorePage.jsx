import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProviderProfilePath, searchProviders } from '../services/providers';
import { resolveBackendAssetUrl } from '../services/api';

export function ProvidersExplorePage() {
	const [tipo, setTipo] = useState('');
	const [ciudad, setCiudad] = useState('');
	const [servicio, setServicio] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [resultados, setResultados] = useState([]);
	const [total, setTotal] = useState(0);

	const buscar = useCallback(async () => {
		setLoading(true);
		setError('');
		try {
			const params = { pagina: 1, limite: 30 };
			if (tipo.trim()) params.tipo = tipo.trim();
			if (ciudad.trim()) params.ciudad = ciudad.trim();
			if (servicio.trim()) params.servicio = servicio.trim();
			const data = await searchProviders(params);
			setResultados(Array.isArray(data.resultados) ? data.resultados : []);
			setTotal(data.total ?? 0);
		} catch (err) {
			setError(err.response?.data?.message || 'Error en la búsqueda.');
			setResultados([]);
		} finally {
			setLoading(false);
		}
	}, [tipo, ciudad, servicio]);

	return (
		<div className="page page--explore">
			<Link className="back-link" to="/">
				← Volver al mapa
			</Link>
			<div className="page-surface page-surface--wide page-surface--explore app-form">
				<header className="page-hero page-hero--explore">
					<h1>Explorar clínicas, paseo y cuidado</h1>
					<p>
						Busca por tipo, ciudad o palabra clave. Encuentra veterinarias, paseadores o cuidadores
						según lo que necesite tu mascota.
					</p>
				</header>

				<div className="explore-filters explore-filters--in-surface" role="search" aria-label="Búsqueda de proveedores">
					<label>
						<span className="explore-filter-label">Tipo de proveedor</span>
						<select
							value={tipo}
							onChange={(e) => setTipo(e.target.value)}
							aria-label="Tipo de proveedor"
						>
							<option value="">Cualquiera</option>
							<option value="veterinaria">Veterinaria</option>
							<option value="paseador">Paseador</option>
							<option value="cuidador">Cuidador</option>
						</select>
					</label>
					<label>
						<span className="explore-filter-label">Ciudad o comuna</span>
						<input
							value={ciudad}
							onChange={(e) => setCiudad(e.target.value)}
							placeholder="Ej. Santiago"
							aria-label="Ciudad o comuna"
						/>
					</label>
					<label>
						<span className="explore-filter-label">Servicio o especialidad</span>
						<input
							value={servicio}
							onChange={(e) => setServicio(e.target.value)}
							placeholder="Texto libre"
							aria-label="Servicio o especialidad"
						/>
					</label>
					<div className="explore-filters__submit">
						<button type="button" className="save-profile-btn explore-search-btn" disabled={loading} onClick={buscar}>
							{loading ? 'Buscando…' : 'Buscar'}
						</button>
					</div>
				</div>

				{error ? (
					<p className="error" role="alert" aria-live="assertive" style={{ margin: '0 0 0.75rem' }}>
						{error}
					</p>
				) : null}

				<p className="explore-total muted">
					<strong className="explore-total__n">{total}</strong>{' '}
					{total === 1 ? 'resultado' : 'resultados'}
					{loading ? <span className="explore-loading"> · Cargando…</span> : null}
				</p>

				<ul className="explore-results" aria-label="Listado de proveedores">
					{resultados.map((p) => {
						const href = getProviderProfilePath({
							id: String(p.id),
							providerType: p.providerType,
							publicSlug: p.providerProfile?.publicSlug
						});
						const img = p.profileImage ? resolveBackendAssetUrl(p.profileImage) : null;
						return (
							<li key={String(p.id)} className="explore-card">
								{img ? <img src={img} alt="" className="explore-thumb" /> : <div className="explore-thumb explore-thumb--placeholder" aria-hidden />}
								<div>
									<strong>
										{p.name} {p.lastName}
									</strong>
									<span className="muted"> · {p.providerType}</span>
									<p className="explore-card__action">
										<Link to={href}>Ver perfil</Link>
									</p>
								</div>
							</li>
						);
					})}
				</ul>
			</div>
		</div>
	);
}
