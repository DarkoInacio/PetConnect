import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { decideReviewReport, fetchReviewReports } from '../services/admin';

const REASON_LABELS = {
	contenido_falso: 'Contenido falso',
	lenguaje_ofensivo: 'Lenguaje ofensivo',
	spam: 'Spam',
	informacion_personal: 'Información personal',
	otro: 'Otro'
};

function formatDate(iso) {
	if (!iso) return '—';
	try {
		return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
	} catch {
		return '—';
	}
}

export function AdminReviewReportsPage() {
	const { user, loading: authLoading } = useAuth();
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [actionMsg, setActionMsg] = useState('');
	const [estado, setEstado] = useState('pendiente');
	const [nota, setNota] = useState('');
	const [busyId, setBusyId] = useState('');

	const reload = useCallback(async () => {
		const res = await fetchReviewReports({ estado });
		setData(res);
	}, [estado]);

	useEffect(() => {
		if (authLoading || !user || user.role !== 'admin') return;
		let cancel = false;
		(async () => {
			try {
				setLoading(true);
				setError('');
				await reload();
			} catch (err) {
				if (!cancel) setError(err.response?.data?.message || 'Error al cargar reportes.');
			} finally {
				if (!cancel) setLoading(false);
			}
		})();
		return () => {
			cancel = true;
		};
	}, [authLoading, user, reload]);

	if (authLoading) {
		return (
			<div className="page">
				<p>Cargando…</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace state={{ from: '/admin/resenas-reportes' }} />;
	}

	if (user.role !== 'admin') {
		return (
			<div className="page">
				<Link className="back-link" to="/">
					Volver
				</Link>
				<p className="error">Solo administradores.</p>
			</div>
		);
	}

	const list = Array.isArray(data?.reports) ? data.reports : [];

	async function runAction(reportId, accion) {
		setBusyId(String(reportId));
		setActionMsg('');
		try {
			const r = await decideReviewReport(String(reportId), { accion, nota: nota.trim() || undefined });
			setActionMsg(r.message || 'Listo.');
			setNota('');
			await reload();
		} catch (err) {
			setActionMsg(err.response?.data?.message || 'Error al resolver.');
		} finally {
			setBusyId('');
		}
	}

	return (
		<div className="page bookings-page">
			<Link className="back-link" to="/admin/proveedores">
				Admin proveedores
			</Link>
			<h1>Reportes de reseñas</h1>
			<p className="muted">Cola de moderación. Resolución según política del equipo.</p>
			<div className="mb-3" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
				<label className="text-sm">
					Estado
					<select
						style={{ marginLeft: '0.25rem' }}
						value={estado}
						onChange={(e) => setEstado(e.target.value)}
					>
						<option value="pendiente">Pendiente</option>
						<option value="revisada_resena_mantenida">Cerrado — reseña mantenida</option>
						<option value="revisada_resena_eliminada">Cerrado — reseña retirada</option>
						<option value="revisada_autor_suspendido">Cerrado — autor sancionado</option>
					</select>
				</label>
			</div>
			<label className="review-field" style={{ maxWidth: '32rem' }}>
				<span>Nota interna (opcional, se aplica a la próxima acción)</span>
				<textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} maxLength={2000} />
			</label>
			{actionMsg ? <p className="review-success">{actionMsg}</p> : null}
			{loading ? <p>Cargando…</p> : null}
			{error ? <p className="error">{error}</p> : null}
			{!loading && !error && list.length === 0 ? <p className="bookings-empty">Sin reportes en este filtro.</p> : null}
			{!loading && list.length > 0 ? (
				<div className="bookings-table-wrap" style={{ marginTop: '1rem' }}>
					<table className="bookings-table">
						<thead>
							<tr>
								<th>Fecha</th>
								<th>Motivo</th>
								<th>Reportante</th>
								<th>Reseña</th>
								<th>Acciones</th>
							</tr>
						</thead>
						<tbody>
							{list.map((rep) => {
								const id = String(rep._id);
								const rev = rep.reviewId;
								const repUser = rep.reporterId;
								return (
									<tr key={id}>
										<td>{formatDate(rep.createdAt)}</td>
										<td>
											{REASON_LABELS[rep.reason] || rep.reason}
											{rep.reason === 'otro' && rep.otherText ? (
												<small>
													<br />
													{rep.otherText}
												</small>
											) : null}
										</td>
										<td>
											{repUser
												? [repUser.name, repUser.lastName].filter(Boolean).join(' ') || repUser.email
												: '—'}
										</td>
										<td className="bookings-detail">
											{rev ? (
												<>
													{rev.rating != null ? `${rev.rating}★ ` : null}
													{rev.comment ? String(rev.comment).slice(0, 120) : '—'}
													{rev.comment && String(rev.comment).length > 120 ? '…' : ''}
												</>
											) : (
												'—'
											)}
										</td>
										<td className="owner-booking-actions">
											{rep.status === 'pendiente' ? (
												<>
													<button
														type="button"
														className="btn-sm"
														disabled={busyId === id}
														onClick={() => void runAction(rep._id, 'aprobar_reseña')}
													>
														Mantener reseña
													</button>
													<button
														type="button"
														className="btn-reject btn-sm"
														disabled={busyId === id}
														onClick={() => void runAction(rep._id, 'eliminar_reseña')}
													>
														Retirar reseña
													</button>
													<button
														type="button"
														className="btn-sm"
														disabled={busyId === id}
														onClick={() => void runAction(rep._id, 'suspender_autor')}
													>
														Suspender autor
													</button>
												</>
											) : (
												<span className="muted">{rep.status}</span>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			) : null}
		</div>
	);
}
