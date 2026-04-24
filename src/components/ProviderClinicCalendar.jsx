import { useMemo, useState } from 'react';
import { getYmdInChile, formatTimeInChile, formatInChile } from '../constants/chileTime';

const VIEWS = [
	{ id: 'day', label: 'Día' },
	{ id: 'week', label: 'Semana' },
	{ id: 'month', label: 'Mes' }
];

/**
 * @typedef {{ id: string, startAt: string, endAt: string, line: string, client: string, status: string }} CalEvent
 */

const pad2 = (n) => String(n).padStart(2, '0');
function localYmd(d) {
	return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function ymdForGrid(d) {
	return getYmdInChile(d) || localYmd(d);
}
function addDays(d, n) {
	const x = new Date(d);
	x.setDate(x.getDate() + n);
	return x;
}
function startOfWeekMon(d) {
	const x = new Date(d);
	const off = (x.getDay() + 6) % 7;
	x.setDate(x.getDate() - off);
	x.setHours(12, 0, 0, 0);
	return x;
}
function monthLabelES(d) {
	return new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(d);
}
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/**
 * @param {{ events: CalEvent[] }} props
 */
export function ProviderClinicCalendar({ events }) {
	const [view, setView] = useState(/** @type {'day'|'week'|'month'} */ ('week'));
	const [anchor, setAnchor] = useState(() => new Date());

	const byYmd = useMemo(() => {
		/** @type {Record<string, CalEvent[]>} */
		const m = {};
		for (const e of events) {
			const y = getYmdInChile(e.startAt);
			if (!y) continue;
			if (!m[y]) m[y] = [];
			m[y].push(e);
		}
		for (const k of Object.keys(m)) {
			m[k].sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
		}
		return m;
	}, [events]);

	const todayYmd = getYmdInChile(new Date());
	const selectedYmd = ymdForGrid(anchor);

	const weekStart = useMemo(() => startOfWeekMon(anchor), [anchor]);
	const weekDays = useMemo(() => {
		return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
	}, [weekStart]);

	const monthMatrix = useMemo(() => {
		const y = anchor.getFullYear();
		const mon = anchor.getMonth();
		const first = new Date(y, mon, 1, 12, 0, 0, 0);
		const start = startOfWeekMon(first);
		const weeks = [];
		let cur = new Date(start);
		for (let w = 0; w < 6; w++) {
			const row = [];
			for (let d = 0; d < 7; d++) {
				const cell = new Date(cur);
				row.push(cell);
				cur = addDays(cur, 1);
			}
			weeks.push(row);
		}
		return { weeks, y, mon };
	}, [anchor]);

	function goPrev() {
		setAnchor((a) => {
			const x = new Date(a);
			if (view === 'day') x.setDate(x.getDate() - 1);
			else if (view === 'week') x.setDate(x.getDate() - 7);
			else x.setMonth(x.getMonth() - 1);
			return x;
		});
	}
	function goNext() {
		setAnchor((a) => {
			const x = new Date(a);
			if (view === 'day') x.setDate(x.getDate() + 1);
			else if (view === 'week') x.setDate(x.getDate() + 7);
			else x.setMonth(x.getMonth() + 1);
			return x;
		});
	}
	function goToday() {
		setAnchor(new Date());
	}

	return (
		<div className="clinic-calendar">
			<div className="clinic-calendar__toolbar">
				<div className="clinic-calendar__view-tabs" role="tablist" aria-label="Vista de calendario">
					{VIEWS.map((v) => (
						<button
							key={v.id}
							type="button"
							role="tab"
							aria-selected={view === v.id}
							className={view === v.id ? 'clinic-calendar__tab is-active' : 'clinic-calendar__tab'}
							onClick={() => setView(/** @type {any} */ (v.id))}
						>
							{v.label}
						</button>
					))}
				</div>
				<div className="clinic-calendar__nav">
					<button type="button" className="btn-sm" onClick={goPrev} aria-label="Anterior">
						‹
					</button>
					<button type="button" className="btn-sm" onClick={goToday}>
						Hoy
					</button>
					<button type="button" className="btn-sm" onClick={goNext} aria-label="Siguiente">
						›
					</button>
					<span className="clinic-calendar__title">
						{view === 'day' && formatInChile(anchor)}
						{view === 'week' &&
							`Semana del ${pad2(weekStart.getDate())} ${new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(weekStart)} ${weekStart.getFullYear()}`}
						{view === 'month' && <span className="capitalize">{monthLabelES(anchor)}</span>}
					</span>
				</div>
			</div>

			{events.length === 0 ? <p className="muted" style={{ margin: '0.5rem 0' }}>Sin citas en el periodo de la lista. Las confirmadas o pendientes aparecerán aquí con la línea y el cliente.</p> : null}

			{view === 'day' && (
				<DayList ymd={selectedYmd} byYmd={byYmd} todayYmd={todayYmd} />
			)}

			{view === 'week' && (
				<div className="clinic-calendar__grid clinic-calendar__grid--week">
					{weekDays.map((d) => {
						const ymd = ymdForGrid(d);
						const isToday = ymd === todayYmd;
						const list = byYmd[ymd] || [];
						return (
							<div key={ymd} className={isToday ? 'clinic-calendar__day is-today' : 'clinic-calendar__day'}>
								<div className="clinic-calendar__dayhead">
									<small className="muted">
										{WEEKDAYS[(d.getDay() + 6) % 7]}{' '}
										<strong>{d.getDate()}</strong>
									</small>
								</div>
								<ul className="clinic-calendar__events">
									{list.length === 0 ? (
										<li className="clinic-calendar__empty">—</li>
									) : (
										list.map((e) => (
											<li key={e.id}>
												<EventCard e={e} detailed />
											</li>
										))
									)}
								</ul>
							</div>
						);
					})}
				</div>
			)}

			{view === 'month' && (
				<div className="clinic-calendar__grid clinic-calendar__grid--month" role="grid" aria-label="Vista mensual">
					<div className="clinic-calendar__month-cols" aria-hidden>
						{WEEKDAYS.map((d) => (
							<div key={d} className="clinic-calendar__dow">
								{d}
							</div>
						))}
					</div>
					{monthMatrix.weeks.map((row, ri) => (
						<div key={ri} className="clinic-calendar__mweek">
							{row.map((d) => {
								const inMonth = d.getMonth() === monthMatrix.mon;
								const ymd = ymdForGrid(d);
								const isToday = ymd === todayYmd;
								const list = (byYmd[ymd] || []).slice(0, 3);
								return (
									<div
										key={ymd}
										className={
											'clinic-calendar__mcell' +
											(!inMonth ? ' is-faint' : '') +
											(isToday ? ' is-today' : '')
										}
									>
										<div className="clinic-calendar__mdate">{d.getDate()}</div>
										<ul className="clinic-calendar__mitems">
											{list.map((e) => (
												<li key={e.id} className="clinic-calendar__mchip" title={e.client + ' — ' + e.line}>
													{formatTimeInChile(e.startAt)} {e.client.split(' ')[0] || e.client}
												</li>
											))}
											{(byYmd[ymd] || []).length > 3 ? (
												<li className="muted" style={{ fontSize: '0.75rem' }}>
													+{(byYmd[ymd] || []).length - 3} más
												</li>
											) : null}
										</ul>
									</div>
								);
							})}
						</div>
					))}
				</div>
			)}
		</div>
	);
}

/**
 * @param {{ ymd: string, byYmd: Record<string, CalEvent[]>, todayYmd: string | null }} props
 */
function DayList({ ymd, byYmd, todayYmd }) {
	const list = byYmd[ymd] || [];
	if (list.length === 0) {
		return (
			<p className="muted" style={{ margin: 0 }}>
				{ymd === todayYmd
					? 'No hay citas este día.'
					: 'No hay citas el día ' + ymd + '.'}
			</p>
		);
	}
	return (
		<ul className="clinic-calendar__fullday" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
			{list.map((e) => (
				<li key={e.id} style={{ marginBottom: 10 }}>
					<EventCard e={e} detailed />
				</li>
			))}
		</ul>
	);
}

/**
 * @param {{ e: CalEvent, detailed?: boolean }} props
 */
function EventCard({ e, detailed }) {
	if (detailed === false) return null;
	return (
		<div className="clinic-calendar__card">
			<div className="clinic-calendar__time">
				{formatTimeInChile(e.startAt)} – {formatTimeInChile(e.endAt)}
			</div>
			<div className="clinic-calendar__line">{e.line}</div>
			<div className="clinic-calendar__client">{e.client}</div>
			<small className="muted">{e.status}</small>
		</div>
	);
}

export function mapBookingToCalEvent(row, ownerLabelFn) {
	const isLeg = row.kind === 'cita_legacy';
	const own = isLeg ? row.dueno : row.owner;
	const client = ownerLabelFn(own);
	const line = isLeg
		? row.servicio || 'Cita (formulario clásico)'
		: row.clinicService?.displayName
			? String(row.clinicService.displayName)
			: row.bookingSource === 'walker_request'
				? 'Paseo / cuidado'
				: 'Línea no indicada';
	const st = isLeg
		? row.status === 'pendiente'
			? 'Pendiente'
			: row.status === 'confirmada'
				? 'Confirmada'
				: String(row.status)
		: row.status === 'pending_confirmation'
			? 'Pendiente confirmar'
			: row.status === 'confirmed'
				? 'Confirmada'
				: String(row.status);
	return {
		id: `${row.kind}-${row.id}`,
		startAt: row.startAt,
		endAt: row.endAt,
		line,
		client,
		status: st
	};
}

export function filterBookingsForCalendar(b) {
	if (b.kind === 'cita_legacy') {
		return b.status === 'pendiente' || b.status === 'confirmada' || b.status === 'completada';
	}
	if (b.kind === 'appointment') {
		if (b.status === 'cancelled_by_owner' || b.status === 'cancelled_by_provider') return false;
		return true;
	}
	return false;
}
