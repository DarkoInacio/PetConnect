import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
	AlertCircle,
	Ban,
	BarChart3,
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	CalendarDays,
	ClipboardList,
	FileText,
	Stethoscope
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../lib/userRoles';
import { fetchProviderBookings, fetchVetProviderSummary } from '../services/bookings';
import {
	cancelAppointmentAsProvider,
	confirmAppointmentAsProvider,
	completeVetClinicAppointmentAsProvider,
	patchAppointmentInternalNotes
} from '../services/appointments';
import {
	addCalendarDaysYmd,
	CL_TZ,
	formatChileDateTimeRange,
	getYmdInChile
} from '../constants/chileTime';

const STATUS_LABEL = {
	pending_confirmation: 'Pendiente confirmación',
	confirmed: 'Confirmada',
	cancelled_by_owner: 'Cancelada (dueño)',
	cancelled_by_provider: 'Cancelada (clínica)',
	completed: 'Completada',
	no_show: 'No asistió'
};

const weekdayLongChileFmt = new Intl.DateTimeFormat('es-CL', {
	timeZone: CL_TZ,
	weekday: 'long'
});

function weekMondayYmdFromChile(anchorYmd) {
	let ymd = anchorYmd;
	for (let i = 0; i < 7; i++) {
		const dow = weekdayLongChileFmt.format(new Date(`${ymd}T12:00:00`));
		if (dow.toLowerCase().startsWith('lun')) return ymd;
		ymd = addCalendarDaysYmd(ymd, -1);
	}
	return anchorYmd;
}

function statusBadgeClass(status) {
	const s = String(status || '');
	const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap';
	if (s.includes('cancel')) return `${base} bg-red-100 text-red-800 dark:bg-red-950/45 dark:text-red-300`;
	if (s === 'completed') return `${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-300`;
	if (s === 'pending_confirmation') return `${base} bg-amber-100 text-amber-900 dark:bg-amber-950/35 dark:text-amber-300`;
	return `${base} bg-sky-100 text-sky-900 dark:bg-sky-950/40 dark:text-sky-300`;
}

function ownerName(o) {
	if (!o) return '—';
	const n = `${o.name || ''} ${o.lastName || ''}`.trim();
	return n || '—';
}

function petLabel(row) {
	const p = row.pet;
	if (!p?.name) return '—';
	return `${p.name}${p.species ? ` · ${p.species}` : ''}`;
}

function petIdStr(row) {
	const p = row.petId;
	if (!p) return '';
	return typeof p === 'object' && p._id ? String(p._id) : String(p);
}

export function VetClinicAdminPage() {
	const { user, loading } = useAuth();
	const [bookings, setBookings] = useState([]);
	const [loadingBookings, setLoadingBookings] = useState(true);
	const [error, setError] = useState('');
	const [actionMsg, setActionMsg] = useState('');
	const [summary, setSummary] = useState(null);
	const [summaryErr, setSummaryErr] = useState('');
	const [anchorYmd, setAnchorYmd] = useState(() => getYmdInChile(new Date()) || '');
	const [viewMode, setViewMode] = useState(/** @type {'day' | 'week' | 'month'} */ ('week'));
	const [notesRow, setNotesRow] = useState(null);
	const [notesDraft, setNotesDraft] = useState('');
	const [savingNotes, setSavingNotes] = useState(false);

	const reloadBookings = useCallback(async () => {
		const b = await fetchProviderBookings();
		setBookings(Array.isArray(b.items) ? b.items : []);
	}, []);

	useEffect(() => {
		if (loading || !user || !hasRole(user, 'proveedor') || user.providerType !== 'veterinaria') return;
		const c = new AbortController();
		(async () => {
			try {
				setLoadingBookings(true);
				setError('');
				await reloadBookings();
			} catch (e) {
				if (e.name === 'CanceledError' || e.name === 'AbortError') return;
				setError(e.response?.data?.message || 'No se pudieron cargar las citas.');
			} finally {
				setLoadingBookings(false);
			}
		})();
		return () => c.abort();
	}, [loading, user, reloadBookings]);

	useEffect(() => {
		if (loading || !user || !hasRole(user, 'proveedor') || user.providerType !== 'veterinaria') return;
		const c = new AbortController();
		(async () => {
			try {
				setSummaryErr('');
				const s = await fetchVetProviderSummary(c.signal);
				setSummary(s || null);
			} catch (e) {
				if (e.name === 'CanceledError' || e.name === 'AbortError') return;
				setSummary(null);
				setSummaryErr(e.response?.data?.message || '');
			}
		})();
		return () => c.abort();
	}, [loading, user]);

	const todayYmd = useMemo(() => getYmdInChile(new Date()) || '', []);

	const todaySummary = useMemo(() => {
		const counts = { confirmed: 0, pending: 0, completed: 0 };
		for (const row of bookings) {
			const ymd = getYmdInChile(row.startAt);
			if (ymd !== todayYmd) continue;
			if (row.status === 'confirmed') counts.confirmed += 1;
			else if (row.status === 'pending_confirmation') counts.pending += 1;
			else if (row.status === 'completed') counts.completed += 1;
		}
		return counts;
	}, [bookings, todayYmd]);

	const pendingAll = useMemo(
		() =>
			bookings
				.filter((x) => x.status === 'pending_confirmation')
				.sort((a, b) => new Date(a.startAt) - new Date(b.startAt)),
		[bookings]
	);

	const agendaFiltered = useMemo(() => {
		if (!anchorYmd) return [];
		let list = [...bookings];
		if (viewMode === 'day') {
			list = list.filter((r) => getYmdInChile(r.startAt) === anchorYmd);
		} else if (viewMode === 'month') {
			const ym = anchorYmd.slice(0, 7);
			list = list.filter((r) => {
				const ymd = getYmdInChile(r.startAt);
				return ymd && ymd.startsWith(ym);
			});
		} else {
			const mon = weekMondayYmdFromChile(anchorYmd);
			const sun = addCalendarDaysYmd(mon, 6);
			list = list.filter((r) => {
				const ymd = getYmdInChile(r.startAt);
				return ymd && ymd >= mon && ymd <= sun;
			});
		}
		list.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
		return list;
	}, [bookings, anchorYmd, viewMode]);

	const historyPatients = useMemo(() => {
		const rows = bookings.filter((b) => b.status === 'completed');
		const byKey = new Map();
		for (const row of rows) {
			const pid = petIdStr(row);
			const key = pid || `${row.owner?._id || ''}-${row.pet?.name}-${row.pet?.species}`;
			const prev = byKey.get(key);
			const ta = new Date(row.startAt).getTime();
			if (!prev || ta > prev.lastAt) {
				byKey.set(key, { row, lastAt: ta, pid });
			}
		}
		return Array.from(byKey.values()).sort((a, b) => b.lastAt - a.lastAt);
	}, [bookings]);

	function navAnchor(delta) {
		setAnchorYmd((cur) => {
			const base = cur || todayYmd;
			if (!base) return cur;
			if (viewMode === 'month') {
				const parts = base.split('-').map(Number);
				const y = parts[0];
				const m = parts[1];
				const d = new Date(Date.UTC(y, m - 1 + delta, 1, 12));
				return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
			}
			const step = viewMode === 'week' ? delta * 7 : delta;
			return addCalendarDaysYmd(base, step);
		});
	}

	function openNotes(row) {
		setNotesRow(row);
		setNotesDraft(typeof row.internalNotes === 'string' ? row.internalNotes : '');
	}

	async function submitNotes(e) {
		e.preventDefault();
		if (!notesRow?.id) return;
		setSavingNotes(true);
		try {
			await patchAppointmentInternalNotes(String(notesRow.id), notesDraft.trim());
			setActionMsg('Notas internas guardadas.');
			await reloadBookings();
			setNotesRow(null);
		} catch (err) {
			setActionMsg(err.response?.data?.message || 'No se pudieron guardar las notas.');
		} finally {
			setSavingNotes(false);
		}
	}

	async function onConfirm(row) {
		setActionMsg('');
		try {
			await confirmAppointmentAsProvider(row.id);
			setActionMsg('Cita confirmada.');
			await reloadBookings();
		} catch (err) {
			setActionMsg(err.response?.data?.message || 'No se pudo confirmar.');
		}
	}

	async function onCancel(row) {
		const reason = window.prompt('Motivo de cancelación (obligatorio):');
		if (!reason?.trim()) return;
		setActionMsg('');
		try {
			await cancelAppointmentAsProvider(String(row.id), reason.trim());
			setActionMsg('Cita cancelada.');
			await reloadBookings();
		} catch (err) {
			setActionMsg(err.response?.data?.message || 'No se pudo cancelar.');
		}
	}

	async function onComplete(row) {
		if (
			!window.confirm(
				'¿Marcar esta atención como completada? Luego podrás registrar visita en ficha médica si hay mascota vinculada.'
			)
		)
			return;
		setActionMsg('');
		try {
			await completeVetClinicAppointmentAsProvider(String(row.id));
			setActionMsg('Cita marcada como completada.');
			await reloadBookings();
		} catch (err) {
			setActionMsg(err.response?.data?.message || 'No se pudo completar.');
		}
	}

	function periodTitle() {
		if (!anchorYmd) return '';
		if (viewMode === 'day') return anchorYmd;
		if (viewMode === 'month') return anchorYmd.slice(0, 7);
		const mon = weekMondayYmdFromChile(anchorYmd);
		const sun = addCalendarDaysYmd(mon, 6);
		return `${mon} — ${sun}`;
	}

	const pageCls =
		'mx-auto w-full max-w-[1200px] px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]';

	if (loading) {
		return (
			<div className={pageCls}>
				<p className="text-muted-foreground">Cargando…</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace state={{ from: '/proveedor/admin-citas' }} />;
	}

	if (!hasRole(user, 'proveedor') || user.providerType !== 'veterinaria') {
		return (
			<div className={pageCls}>
				<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive m-0">
					Solo cuentas de veterinarias pueden acceder al panel administrativo de citas.
				</p>
				<Link className="inline-block mt-4 text-primary font-semibold hover:underline" to="/proveedor">
					Volver al panel
				</Link>
			</div>
		);
	}

	const KPI = ({
		icon: Icon,
		label,
		value,
		accentClass
	}) => (
		<div
			className={`rounded-xl border border-border bg-card px-4 py-3 shadow-sm flex items-start gap-3 ${accentClass}`}
		>
			<Icon className="size-5 mt-0.5 text-muted-foreground shrink-0" aria-hidden />
			<div>
				<p className="text-[0.7rem] font-bold uppercase tracking-wide text-muted-foreground m-0 mb-1">{label}</p>
				<p className="text-2xl font-bold tabular-nums text-foreground m-0">{value}</p>
			</div>
		</div>
	);

	const pendingBadge = pendingAll.length;

	return (
		<div className={pageCls}>
			<div className="flex flex-wrap items-center gap-4 mb-4">
				<Link
					className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline min-h-10"
					to="/proveedor"
				>
					← Panel clínica
				</Link>
				<Link
					className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline min-h-10"
					to="/proveedor/pacientes"
				>
					Pacientes atendidos
				</Link>
			</div>

			<header className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden mb-5">
				<div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/40 dark:bg-muted/20">
					<Stethoscope className="size-4 text-primary shrink-0" aria-hidden />
					<span className="text-[0.72rem] font-bold uppercase tracking-widest text-primary/75">
						Administración
					</span>
				</div>
				<div className="px-5 py-4">
					<h1 className="text-[clamp(1.25rem,2.2vw,1.65rem)] font-bold tracking-tight text-foreground m-0 mb-1">
						Citas · Panel veterinaria
					</h1>
					<p className="text-sm text-muted-foreground max-w-[50ch] m-0">
						Gestiona el día, la agenda por periodo y el seguimiento; las{' '}
						<strong>notas internas</strong> solo las ves tú en este panel.
					</p>
				</div>
			</header>

			<section aria-label="Resumen del día" className="mb-5">
				<h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3 m-0">
					<CalendarDays className="size-4 text-primary" aria-hidden /> Resumen de hoy (Chile)
				</h2>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<KPI
						icon={CheckCircle}
						label="Confirmadas hoy"
						value={todaySummary.confirmed}
						accentClass="border-l-4 border-l-sky-500"
					/>
					<KPI
						icon={AlertCircle}
						label="Pendientes hoy"
						value={todaySummary.pending}
						accentClass="border-l-4 border-l-amber-500"
					/>
					<KPI
						icon={ClipboardList}
						label="Completadas hoy"
						value={todaySummary.completed}
						accentClass="border-l-4 border-l-emerald-500"
					/>
				</div>
			</section>

			<section aria-label="Indicadores del mes y reseñas" className="mb-5">
				<h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3 m-0">
					<BarChart3 className="size-4 text-primary" aria-hidden /> Estadísticas
				</h2>
				<div className="rounded-xl border border-border bg-muted/20 dark:bg-muted/10 px-4 py-4 flex flex-wrap gap-6 text-sm">
					{summaryErr ? (
						<p className="text-muted-foreground m-0">{summaryErr}</p>
					) : summary ? (
						<>
							<div>
								<p className="text-[0.7rem] font-bold uppercase text-muted-foreground m-0">Citas del mes</p>
								<p className="text-xl font-bold m-0 tabular-nums">{summary.monthAppointmentsCount}</p>
							</div>
							<div>
								<p className="text-[0.7rem] font-bold uppercase text-muted-foreground m-0">Calificación media</p>
								<p className="text-xl font-bold m-0 tabular-nums">
									{summary.ratingAverage != null ? summary.ratingAverage.toFixed(1) : '—'}
								</p>
							</div>
							<div>
								<p className="text-[0.7rem] font-bold uppercase text-muted-foreground m-0">Reseñas</p>
								<p className="text-xl font-bold m-0 tabular-nums">{summary.reviewCount ?? 0}</p>
							</div>
						</>
					) : (
						<p className="text-muted-foreground m-0">Sin datos de estadísticas.</p>
					)}
				</div>
			</section>

			<section
				className="rounded-xl border-2 border-amber-400/60 bg-amber-50 dark:bg-amber-950/20 px-4 py-4 mb-5"
				aria-label="Pendientes de confirmación"
			>
				<div className="flex flex-wrap items-center justify-between gap-2 mb-3">
					<h2 className="text-[0.95rem] font-bold text-foreground m-0 flex items-center gap-2">
						Pendientes de confirmación
						<span className="inline-flex min-w-7 justify-center rounded-full bg-amber-600 text-white text-xs font-black px-2 py-0.5 tabular-nums">
							{pendingBadge}
						</span>
					</h2>
				</div>
				{pendingAll.length === 0 ? (
					<p className="text-sm text-muted-foreground m-0">No tienes solicitudes esperando respuesta.</p>
				) : (
					<ul className="list-none space-y-2 m-0 p-0">
						{pendingAll.map((row) => (
							<li
								key={`pend-${row.id}`}
								className="rounded-lg bg-background border border-border px-3 py-2 flex flex-wrap gap-x-4 gap-y-2 items-center justify-between"
							>
								<span className="text-sm font-medium">
									{formatChileDateTimeRange(row.startAt, row.endAt)} · {ownerName(row.owner)} ·{' '}
									{petLabel(row)}
								</span>
								<button
									type="button"
									className="text-xs font-bold rounded-lg px-3 py-1.5 bg-emerald-700 text-white border-0 cursor-pointer hover:bg-emerald-600"
									onClick={() => onConfirm(row)}
								>
									Confirmar
								</button>
							</li>
						))}
					</ul>
				)}
			</section>

			<section className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm">
				<div className="flex flex-wrap items-center gap-3 justify-between mb-4">
					<h2 className="text-[0.95rem] font-bold m-0">Agenda</h2>
					<div className="flex flex-wrap gap-2" role="group" aria-label="Vista de agenda">
						{(['day', 'week', 'month']).map((m) => (
							<button
								key={m}
								type="button"
								className={`rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors border ${
									viewMode === m
										? 'bg-primary text-primary-foreground border-primary'
										: 'bg-muted/50 border-border text-foreground hover:bg-muted'
								}`}
								onClick={() => setViewMode(m)}
								aria-pressed={viewMode === m}
							>
								{m === 'day' ? 'Día' : m === 'week' ? 'Semana' : 'Mes'}
							</button>
						))}
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-3 mb-2">
					<button
						type="button"
						aria-label="Periodo anterior"
						className="inline-flex items-center rounded-lg border border-border bg-background p-2 hover:bg-muted cursor-pointer"
						onClick={() => navAnchor(-1)}
					>
						<ChevronLeft className="size-5" aria-hidden />
					</button>
					<span className="text-sm font-semibold tabular-nums min-w-[8rem] text-center">{periodTitle()}</span>
					<button
						type="button"
						aria-label="Periodo siguiente"
						className="inline-flex items-center rounded-lg border border-border bg-background p-2 hover:bg-muted cursor-pointer"
						onClick={() => navAnchor(1)}
					>
						<ChevronRight className="size-5" aria-hidden />
					</button>
					<button
						type="button"
						className="text-xs font-semibold text-primary hover:underline cursor-pointer ml-auto"
						onClick={() => setAnchorYmd(getYmdInChile(new Date()) || '')}
					>
						Ir a hoy
					</button>
				</div>
				<p className="text-xs text-muted-foreground m-0 mb-3">
					Horarios y bloqueos de franjas:{' '}
					<Link to="/proveedor" className="text-primary font-semibold hover:underline">
						Panel principal → Mantenimiento y tramos ofrecidos
					</Link>
					.
				</p>
			</section>

			{actionMsg ? (
				<p
					className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-3 text-sm text-emerald-800 dark:text-emerald-300 mb-4 m-0"
					role="status"
				>
					{actionMsg}
				</p>
			) : null}

			{error ? (
				<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive mb-4 m-0">
					{error}
				</p>
			) : null}

			<section className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm mb-10" aria-live="polite">
				{loadingBookings ? (
					<p className="p-6 text-muted-foreground">Cargando citas…</p>
				) : agendaFiltered.length === 0 ? (
					<p className="p-6 text-muted-foreground m-0">No hay citas en esta vista para el período seleccionado.</p>
				) : (
					<table className="w-full border-collapse text-sm min-w-[720px]">
						<thead>
							<tr className="bg-muted/45 dark:bg-muted/20 border-b border-border">
								<th scope="col" className="text-left px-3 py-2.5 font-bold text-[0.7rem] uppercase tracking-wide text-muted-foreground">
									Hora / fecha
								</th>
								<th scope="col" className="text-left px-3 py-2.5 font-bold text-[0.7rem] uppercase tracking-wide text-muted-foreground">
									Dueño
								</th>
								<th scope="col" className="text-left px-3 py-2.5 font-bold text-[0.7rem] uppercase tracking-wide text-muted-foreground">
									Mascota
								</th>
								<th scope="col" className="text-left px-3 py-2.5 font-bold text-[0.7rem] uppercase tracking-wide text-muted-foreground">
									Servicio
								</th>
								<th scope="col" className="text-left px-3 py-2.5 font-bold text-[0.7rem] uppercase tracking-wide text-muted-foreground">
									Estado
								</th>
								<th scope="col" className="text-left px-3 py-2.5 font-bold text-[0.7rem] uppercase tracking-wide text-muted-foreground">
									Acciones
								</th>
							</tr>
						</thead>
						<tbody>
							{agendaFiltered.map((row) => {
								const svc = row.clinicService?.displayName || row.reason || row.bookingSource || '—';
								const pid = petIdStr(row);
								const canConfirm = row.status === 'pending_confirmation';
								const canCancel = ['pending_confirmation', 'confirmed'].includes(row.status);
								const canComplete = ['pending_confirmation', 'confirmed'].includes(row.status);
								const clinical =
									row.status === 'completed' && pid ? (
										<Link
											className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
											to={`/proveedor/atencion-clinica?appointmentId=${encodeURIComponent(row.id)}&petId=${encodeURIComponent(pid)}`}
										>
											<FileText className="size-3.5" aria-hidden /> Registrar en ficha médica
										</Link>
									) : null;

								return (
									<tr key={row.id} className="border-b border-border/70 hover:bg-muted/15 transition-colors align-top">
										<td className="px-3 py-2.5 text-sm">{formatChileDateTimeRange(row.startAt, row.endAt)}</td>
										<td className="px-3 py-2.5">{ownerName(row.owner)}</td>
										<td className="px-3 py-2.5 text-muted-foreground">{petLabel(row)}</td>
										<td className="px-3 py-2.5 text-muted-foreground">{svc}</td>
										<td className="px-3 py-2.5">
											<span className={statusBadgeClass(row.status)}>{STATUS_LABEL[row.status] || row.status}</span>
										</td>
										<td className="px-3 py-2.5">
											<div className="flex flex-col gap-1.5 items-start">
												<div className="flex flex-wrap gap-1">
													{canConfirm ? (
														<button
															type="button"
															onClick={() => onConfirm(row)}
															className="text-xs font-bold rounded-md px-2 py-1 bg-emerald-700 text-white border-0 cursor-pointer hover:bg-emerald-600"
														>
															Confirmar
														</button>
													) : null}
													{canCancel ? (
														<button
															type="button"
															onClick={() => onCancel(row)}
															className="text-xs font-bold rounded-md px-2 py-1 bg-white dark:bg-card text-red-800 border border-red-200 dark:border-red-900 dark:text-red-300 cursor-pointer hover:bg-red-50"
														>
															<Ban className="size-3 inline mr-1" aria-hidden /> Cancelar
														</button>
													) : null}
													{canComplete ? (
														<button
															type="button"
															onClick={() => onComplete(row)}
															className="text-xs font-bold rounded-md px-2 py-1 bg-teal-700 text-white border-0 cursor-pointer hover:bg-teal-600"
														>
															Completar
														</button>
													) : null}
													<button
														type="button"
														onClick={() => openNotes(row)}
														className="text-xs font-bold rounded-md px-2 py-1 border border-border bg-background hover:bg-muted cursor-pointer"
													>
														Notas internas
													</button>
												</div>
												{clinical}
												{row.status === 'completed' && !pid ? (
													<span className="text-[0.72rem] text-muted-foreground">
														Sin ID de mascota en la reserva: no se puede abrir la ficha.
													</span>
												) : null}
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				)}
			</section>

			<section className="rounded-xl border border-border bg-card shadow-sm overflow-hidden mb-16">
				<div className="px-5 py-3 border-b border-border bg-muted/30">
					<h2 className="text-base font-bold m-0 flex items-center gap-2">
						<ClipboardList className="size-4 text-primary" aria-hidden /> Historial de pacientes atendidos
					</h2>
					<p className="text-xs text-muted-foreground m-0 mt-1">
						Última visita completada por paciente/mascota. Enlace rápido a ficha si la reserva trae ID de mascota.
					</p>
				</div>
				<ul className="divide-y divide-border m-0 p-0">
					{historyPatients.length === 0 ? (
						<li className="px-5 py-4 text-muted-foreground text-sm">Sin atenciones completadas aún.</li>
					) : (
						historyPatients.map(({ row, pid }) => (
							<li key={`hist-${row.id}-${pid}`} className="px-5 py-3 flex flex-wrap gap-3 justify-between items-center">
								<div>
									<p className="text-sm font-semibold m-0">
										{petLabel(row)} · {ownerName(row.owner)}
									</p>
									<p className="text-xs text-muted-foreground m-0">
										Ult.: {formatChileDateTimeRange(row.startAt, row.endAt)}
									</p>
								</div>
								<div>
									{pid ? (
										<Link className="text-sm font-bold text-primary hover:underline" to={`/mascotas/${pid}/ficha`}>
											Abrir ficha médica →
										</Link>
									) : (
										<span className="text-xs text-muted-foreground">
											No hay ID de mascota en la última visita enlazada
										</span>
									)}
								</div>
							</li>
						))
					)}
				</ul>
			</section>

			{notesRow ? (
				<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" role="dialog" aria-modal>
					<form
						onSubmit={submitNotes}
						className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl p-5"
					>
						<h3 className="text-[1rem] font-bold mb-3 m-0">Notas internas</h3>
						<p className="text-xs text-muted-foreground m-0 mb-2">{formatChileDateTimeRange(notesRow.startAt, notesRow.endAt)}</p>
						<textarea
							className="w-full min-h-[8rem] rounded-xl border border-input bg-background px-3 py-2 text-sm font-[inherit]"
							maxLength={2000}
							value={notesDraft}
							onChange={(e) => setNotesDraft(e.target.value)}
						/>
						<div className="flex flex-wrap justify-end gap-2 mt-3">
							<button
								type="button"
								className="rounded-lg px-4 py-2 text-sm border border-border bg-background hover:bg-muted cursor-pointer"
								onClick={() => setNotesRow(null)}
								disabled={savingNotes}
							>
								Cerrar
							</button>
							<button
								type="submit"
								className="rounded-lg px-4 py-2 text-sm bg-primary font-bold text-primary-foreground hover:bg-primary/90 border-0 cursor-pointer disabled:opacity-60"
								disabled={savingNotes}
							>
								{savingNotes ? 'Guardando…' : 'Guardar'}
							</button>
						</div>
					</form>
				</div>
			) : null}
		</div>
	);
}
