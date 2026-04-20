import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { approveProvider, fetchPendingProviders, rejectProvider } from '../services/admin';
import { runReminders24h } from '../services/adminJobs';

export function AdminProvidersPage() {
	const { user, loading: authLoading } = useAuth();
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [actionMsg, setActionMsg] = useState('');
	const [jobLoading, setJobLoading] = useState(false);

	const reload = useCallback(async () => {
		const res = await fetchPendingProviders({ page: 1, limit: 50 });
		setData(res);
	}, []);

	useEffect(() => {
		if (authLoading || !user || user.role !== 'admin') return;
		let cancelled = false;
		(async () => {
			try {
				setLoading(true);
				setError('');
				await reload();
			} catch (err) {
				if (!cancelled) setError(err.response?.data?.message || 'Error al cargar solicitudes.');
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [authLoading, user, reload]);

	if (authLoading) {
		return (
			<div className='page'>
				<p>Cargando…</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to='/login' replace state={{ from: '/admin/proveedores' }} />;
	}

	if (user.role !== 'admin') {
		return (
			<div className='page'>
				<Link className='back-link' to='/'>
					Inicio
				</Link>
				<p className='error'>Se requiere rol administrador.</p>
			</div>
		);
	}

	const items = data?.items || [];

	async function onApprove(id) {
		setActionMsg('');
		try {
			await approveProvider(id);
			setActionMsg('Proveedor aprobado.');
			await reload();
		} catch (err) {
			setActionMsg(err.response?.data?.message || 'No se pudo aprobar.');
		}
	}

	async function onRunReminders() {
		setJobLoading(true);
		setActionMsg('');
		try {
			const res = await runReminders24h();
			setActionMsg(res.message || 'Recordatorios ejecutados.');
		} catch (err) {
			setActionMsg(err.response?.data?.message || 'No se pudo ejecutar el job.');
		} finally {
			setJobLoading(false);
		}
	}

	async function onReject(id) {
		const reason = window.prompt('Motivo del rechazo (obligatorio):');
		if (!reason || !reason.trim()) return;
		setActionMsg('');
		try {
			await rejectProvider(id, reason.trim());
			setActionMsg('Proveedor rechazado.');
			await reload();
		} catch (err) {
			setActionMsg(err.response?.data?.message || 'No se pudo rechazar.');
		}
	}

	return (
		<div className='page admin-page'>
			<Link className='back-link' to='/'>
				Inicio
			</Link>
			<h1>Proveedores en revisión</h1>
			<section className='admin-jobs'>
				<h2>Tareas administrativas</h2>
				<p className='muted'>POST /api/admin/jobs/reminders24h/run</p>
				<button type='button' className='save-profile-btn' disabled={jobLoading} onClick={onRunReminders}>
					{jobLoading ? 'Ejecutando…' : 'Ejecutar recordatorios 24h (manual)'}
				</button>
			</section>
			{loading ? <p>Cargando…</p> : null}
			{error ? <p className='error'>{error}</p> : null}
			{actionMsg ? <p className='review-success'>{actionMsg}</p> : null}

			{!loading && items.length === 0 ? <p className='muted'>No hay solicitudes pendientes.</p> : null}

			{items.length > 0 ? (
				<div className='admin-table-wrap'>
					<table className='bookings-table'>
						<thead>
							<tr>
								<th>Nombre</th>
								<th>Correo</th>
								<th>Tipo</th>
								<th>Teléfono</th>
								<th>Acciones</th>
							</tr>
						</thead>
						<tbody>
							{items.map((p) => (
								<tr key={String(p._id)}>
									<td>
										{p.name} {p.lastName}
									</td>
									<td>{p.email}</td>
									<td>{p.providerType}</td>
									<td>{p.phone}</td>
									<td className='admin-actions'>
										<button type='button' className='btn-approve' onClick={() => onApprove(p._id)}>
											Aprobar
										</button>
										<button type='button' className='btn-reject' onClick={() => onReject(p._id)}>
											Rechazar
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : null}
		</div>
	);
}
