import { useMemo, useState } from 'react';
import { getYmdInChile, formatTimeInChile, formatInChile } from '../constants/chileTime';

const VIEWS = [
	{ id: 'day', label: 'Día' },
	{ id: 'week', label: 'Semana' },
	{ id: 'month', label: 'Mes' }
];

/**
 * @typedef {{
 *   id: string,
 *   startAt: string,
 *   endAt: string,
 *   line: string,
 *   client: string,
 *   status: string,
 *   kind?: 'booking' | 'slot',
 *   slotId?: string,
 *   slotStatus?: string
 * }} CalEvent
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
 * @param {{ events: CalEvent[], onSlotBlock?: (id: string) => void, onSlotUnblock?: (id: string) => void, onSlotDelete?: (id: string) => void, agendaLoading?: boolean, citasLoading?: boolean, mode?: 'citas' | 'oferta' | 'unified' }} props
 * `mode`: citas = solo reservas; oferta = solo tramos; unified = leyenda doble (legacy).
 */
export function ProviderClinicCalendar({
	events,
	onSlotBlock,
	onSlotUnblock,
	onSlotDelete,
	agendaLoading = false,
	citasLoading = false,
	mode = 'unified'
}) {
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

			{mode === 'citas' && citasLoading ? (
				<p className="muted" style={{ margin: '0.5rem 0' }}>Cargando reservas…</p>
			) : null}
			{mode === 'oferta' && agendaLoading ? (
				<p className="muted" style={{ margin: '0.5rem 0' }}>Cargando tramos ofrecidos…</p>
			) : null}
			{mode === 'unified' && agendaLoading ? (
				<p className="muted" style={{ margin: '0.5rem 0' }}>Cargando oferta (tramos) y citas…</p>
			) : null}
			{!citasLoading && mode === 'citas' && events.length === 0 ? (
				<p className="muted" style={{ margin: '0.5rem 0' }}>
					Sin citas con cliente que mostrar (estados cancelados se ocultan). Las confirmadas o pendientes
					aparecerán con nombre y línea.
				</p>
			) : null}
			{!agendaLoading && mode === 'oferta' && events.length === 0 ? (
				<p className="muted" style={{ margin: '0.5rem 0' }}>
					<strong>Sin tramos ofrecidos</strong> a futuro con el filtro actual. Crea o publica la línea de atención,
					o ajusta el &quot;rellenar agenda&quot; (pestaña Citas → mantenimiento) si aplica.
				</p>
			) : null}
			{!agendaLoading && mode === 'unified' && events.length === 0 ? (
				<p className="muted" style={{ margin: '0.5rem 0' }}>
					Aún no hay nada en el calendario: <strong>sin tramos ofrecidos</strong> a futuro o <strong>sin citas</strong>{' '}
					(confirmadas / pendientes). Crea una línea de atención y, si aplica, usa el mantenimiento de agenda
					(rellenar) debajo.
				</p>
			) : null}
			{mode === 'citas' && !citasLoading && events.length > 0 ? (
				<p className="clinic-calendar__legend clinic-calendar__legend--single">
					<span className="clinic-calendar__legend__item">
						<span className="clinic-calendar__legend__swatch clinic-calendar__legend__swatch--book" />
						Reservas (dueño y mascota)
					</span>
				</p>
			) : null}
			{mode === 'oferta' && !agendaLoading && events.length > 0 ? (
				<p className="clinic-calendar__legend clinic-calendar__legend--single">
					<span className="clinic-calendar__legend__item">
						<span className="clinic-calendar__legend__swatch clinic-calendar__legend__swatch--slot" />
						Tramo ofrecido (puedes Cerrar, Abrir o Quitar)
					</span>
				</p>
			) : null}
			{mode === 'unified' && !agendaLoading && events.length > 0 ? (
				<p className="clinic-calendar__legend">
					<span className="clinic-calendar__legend__item">
						<span className="clinic-calendar__legend__swatch clinic-calendar__legend__swatch--book" /> Citas
					</span>
					<span className="clinic-calendar__legend__item">
						<span className="clinic-calendar__legend__swatch clinic-calendar__legend__swatch--slot" /> Oferta
						(turno aún reservable)
					</span>
				</p>
			) : null}

			{view === 'day' && (
				<DayList
					ymd={selectedYmd}
					byYmd={byYmd}
					todayYmd={todayYmd}
					calendarMode={mode}
					onSlotBlock={onSlotBlock}
					onSlotUnblock={onSlotUnblock}
					onSlotDelete={onSlotDelete}
				/>
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
												<EventCard
													e={e}
													detailed
													onSlotBlock={onSlotBlock}
													onSlotUnblock={onSlotUnblock}
													onSlotDelete={onSlotDelete}
												/>
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
												<li
													key={e.id}
													className={
														e.kind === 'slot' ? 'clinic-calendar__mchip clinic-calendar__mchip--slot' : 'clinic-calendar__mchip'
													}
													title={(e.client || '') + ' — ' + (e.line || '')}
												>
													{formatTimeInChile(e.startAt)}{' '}
													{e.kind === 'slot'
														? (e.line || '').length > 12
															? (e.line || '').slice(0, 10) + '…'
															: e.line
														: (e.client || '').split(' ')[0] || e.client}
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
 * @param {{ ymd: string, byYmd: Record<string, CalEvent[]>, todayYmd: string | null, calendarMode: 'citas' | 'oferta' | 'unified', onSlotBlock?: (id: string) => void, onSlotUnblock?: (id: string) => void, onSlotDelete?: (id: string) => void }} props
 */
function DayList({ ymd, byYmd, todayYmd, calendarMode, onSlotBlock, onSlotUnblock, onSlotDelete }) {
	const list = byYmd[ymd] || [];
	if (list.length === 0) {
		if (calendarMode === 'citas') {
			return (
				<p className="muted" style={{ margin: 0 }}>
					{ymd === todayYmd ? 'Sin reservas este día.' : 'Sin reservas el ' + ymd + '.'}
				</p>
			);
		}
		if (calendarMode === 'oferta') {
			return (
				<p className="muted" style={{ margin: 0 }}>
					{ymd === todayYmd
						? 'Sin tramos ofrecidos este día (revisa otra semana o el filtro de línea).'
						: 'Sin oferta el ' + ymd + '.'}
				</p>
			);
		}
		return (
			<p className="muted" style={{ margin: 0 }}>
				{ymd === todayYmd
					? 'Nada en este día (ni oferta de tramo ni cita con cliente).'
					: 'No hay ítems el día ' + ymd + '.'}
			</p>
		);
	}
	return (
		<ul className="clinic-calendar__fullday" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
			{list.map((e) => (
				<li key={e.id} style={{ marginBottom: 10 }}>
					<EventCard
						e={e}
						detailed
						onSlotBlock={onSlotBlock}
						onSlotUnblock={onSlotUnblock}
						onSlotDelete={onSlotDelete}
					/>
				</li>
			))}
		</ul>
	);
}

/**
 * @param {{ e: CalEvent, detailed?: boolean, onSlotBlock?: (id: string) => void, onSlotUnblock?: (id: string) => void, onSlotDelete?: (id: string) => void }} props
 */
function EventCard({ e, detailed, onSlotBlock, onSlotUnblock, onSlotDelete }) {
	if (detailed === false) return null;
	const isSlot = e.kind === 'slot';
	return (
		<div className={isSlot ? 'clinic-calendar__card clinic-calendar__card--slot' : 'clinic-calendar__card'}>
			<div className="clinic-calendar__time">
				{formatTimeInChile(e.startAt)} – {formatTimeInChile(e.endAt)}
			</div>
			<div className="clinic-calendar__line">{e.line}</div>
			<div className="clinic-calendar__client">
				{isSlot ? <em className="clinic-calendar__oferta">{e.client}</em> : e.client}
			</div>
			<small className="muted">{e.status}</small>
			{isSlot && e.slotId && (onSlotBlock || onSlotUnblock || onSlotDelete) ? (
				<div className="clinic-calendar__slot-actions" role="group" aria-label="Gestionar tramo">
					{e.slotStatus === 'available' && onSlotBlock ? (
						<button type="button" className="btn-sm" onClick={() => onSlotBlock(e.slotId)}>
							Cerrar
						</button>
					) : null}
					{e.slotStatus === 'blocked' && onSlotUnblock ? (
						<button type="button" className="btn-sm" onClick={() => onSlotUnblock(e.slotId)}>
							Abrir
						</button>
					) : null}
					{onSlotDelete ? (
						<button type="button" className="btn-reject" onClick={() => onSlotDelete(e.slotId)}>
							Quitar
						</button>
					) : null}
				</div>
			) : null}
		</div>
	);
}

export function mapBookingToCalEvent(row, ownerLabelFn) {
	const client = ownerLabelFn(row.owner);
	const line = row.clinicService?.displayName
		? String(row.clinicService.displayName)
		: row.bookingSource === 'walker_request'
			? 'Paseo / cuidado'
			: 'Línea no indicada';
	const st =
		row.status === 'pending_confirmation'
			? 'Pendiente confirmar'
			: row.status === 'confirmed'
				? 'Confirmada'
				: String(row.status);
	return {
		id: `appointment-${row.id}`,
		kind: 'booking',
		startAt: row.startAt,
		endAt: row.endAt,
		line,
		client,
		status: st
	};
}

/**
 * @param {Record<string, any>} s API agenda slot
 * @returns {CalEvent}
 */
export function mapAgendaSlotToCalEvent(s) {
	const line =
		s.clinicServiceId && typeof s.clinicServiceId === 'object'
			? String(s.clinicServiceId.displayName || 'Línea')
			: 'Línea';
	const st =
		s.status === 'available'
			? 'Oferta (libre)'
			: s.status === 'blocked'
				? 'Cerrado a reservas'
				: String(s.status || '—');
	const sub =
		s.status === 'available' ? 'Público' : s.status === 'blocked' ? 'No publica' : 'Tramo';
	return {
		id: `slot-${s._id}`,
		kind: 'slot',
		slotId: String(s._id),
		slotStatus: s.status,
		startAt: s.startAt,
		endAt: s.endAt,
		line,
		client: sub,
		status: st
	};
}

export function filterBookingsForCalendar(b) {
	if (b.kind !== 'appointment') return false;
	if (b.status === 'cancelled_by_owner' || b.status === 'cancelled_by_provider') return false;
	return true;
}
