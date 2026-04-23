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
		<div className='page'>
			<Link className='back-link' to='/'>
				Mapa
			</Link>
			<h1>Explorar clínicas, paseo y cuidado</h1>
			<p className='muted'>Búsqueda de proveedores (veterinarias, paseadores, cuidadores)</p>

			<div className='filters explore-filters'>
				<label>
					Tipo
					<select value={tipo} onChange={(e) => setTipo(e.target.value)}>
						<option value=''>Cualquiera</option>
						<option value='veterinaria'>Veterinaria</option>
						<option value='paseador'>Paseador</option>
						<option value='cuidador'>Cuidador</option>
					</select>
				</label>
				<label>
					Ciudad / comuna
					<input value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder='Ej. Santiago' />
				</label>
				<label>
					Servicio / especialidad
					<input value={servicio} onChange={(e) => setServicio(e.target.value)} placeholder='Texto libre' />
				</label>
				<button type='button' className='save-profile-btn' disabled={loading} onClick={buscar}>
					{loading ? 'Buscando…' : 'Buscar'}
				</button>
			</div>

			{error ? <p className='error'>{error}</p> : null}
			<p className='muted'>Resultados: {total}</p>

			<ul className='explore-results'>
				{resultados.map((p) => {
					const href = getProviderProfilePath({
						id: String(p.id),
						providerType: p.providerType,
						publicSlug: p.providerProfile?.publicSlug
					});
					const img = p.profileImage ? resolveBackendAssetUrl(p.profileImage) : null;
					return (
						<li key={String(p.id)} className='explore-card'>
							{img ? <img src={img} alt='' className='explore-thumb' /> : null}
							<div>
								<strong>
									{p.name} {p.lastName}
								</strong>
								<span className='muted'> · {p.providerType}</span>
								<p>
									<Link to={href}>Ver perfil</Link>
								</p>
							</div>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
