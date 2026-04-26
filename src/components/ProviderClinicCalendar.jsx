import { useMemo, useState } from 'react';
import { getYmdInChile, formatTimeInChile, formatInChile } from '../constants/chileTime';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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

const swatchSlot = 'w-3 h-3 rounded-[0.2rem] border border-border bg-[color-mix(in_srgb,var(--app-primary)_12%,#f8fafc)] border-[color-mix(in_srgb,var(--app-primary)_35%,#e2e8f0)]';
const swatchBook = 'w-3 h-3 rounded-[0.2rem] border border-[#cbd5e1] bg-white dark:bg-card dark:border-border';

/**
 * @param {{ events: CalEvent[], onSlotBlock?: (id: string) => void, onSlotUnblock?: (id: string) => void, onSlotDelete?: (id: string) => void, agendaLoading?: boolean, citasLoading?: boolean, mode?: 'citas' | 'oferta' | 'unified' }} props
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
		<div className="my-3 mb-5">
			{/* Toolbar */}
			<div className="mb-3 flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap gap-1" role="tablist" aria-label="Vista de calendario">
					{VIEWS.map((v) => (
						<button
							key={v.id}
							type="button"
							role="tab"
							aria-selected={view === v.id}
							className={cn(
								'cursor-pointer rounded-[0.4rem] border px-3 py-1.5 font-[inherit] text-[0.9rem] transition-colors',
								view === v.id
									? 'border-transparent bg-primary text-primary-foreground'
									: 'border-border bg-white text-foreground hover:bg-muted dark:bg-card'
							)}
							onClick={() => setView(/** @type {any} */ (v.id))}
						>
							{v.label}
						</button>
					))}
				</div>
				<div className="flex flex-wrap items-center gap-1.5">
					<button
						type="button"
						className="cursor-pointer rounded-lg border border-border bg-white px-2.5 py-1 text-[0.82rem] text-foreground hover:bg-muted dark:bg-card"
						onClick={goPrev}
						aria-label="Anterior"
					>
						‹
					</button>
					<button
						type="button"
						className="cursor-pointer rounded-lg border border-border bg-white px-2.5 py-1 text-[0.82rem] text-foreground hover:bg-muted dark:bg-card"
						onClick={goToday}
					>
						Hoy
					</button>
					<button
						type="button"
						className="cursor-pointer rounded-lg border border-border bg-white px-2.5 py-1 text-[0.82rem] text-foreground hover:bg-muted dark:bg-card"
						onClick={goNext}
						aria-label="Siguiente"
					>
						›
					</button>
					<span className="ml-2 text-[0.95rem] font-semibold text-foreground">
						{view === 'day' && formatInChile(anchor)}
						{view === 'week' &&
							`Semana del ${pad2(weekStart.getDate())} ${new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(weekStart)} ${weekStart.getFullYear()}`}
						{view === 'month' && <span className="capitalize">{monthLabelES(anchor)}</span>}
					</span>
				</div>
			</div>

			{/* Loading / empty messages */}
			{mode === 'citas' && citasLoading ? (
				<p className="my-2 text-muted-foreground">Cargando reservas…</p>
			) : null}
			{mode === 'oferta' && agendaLoading ? (
				<p className="my-2 text-muted-foreground">Cargando tramos ofrecidos…</p>
			) : null}
			{mode === 'unified' && agendaLoading ? (
				<p className="my-2 text-muted-foreground">Cargando oferta (tramos) y citas…</p>
			) : null}
			{!citasLoading && mode === 'citas' && events.length === 0 ? (
				<p className="my-2 text-muted-foreground">
					Sin citas con cliente que mostrar (estados cancelados se ocultan). Las confirmadas o pendientes
					aparecerán con nombre y línea.
				</p>
			) : null}
			{!agendaLoading && mode === 'oferta' && events.length === 0 ? (
				<p className="my-2 text-muted-foreground">
					<strong>Sin tramos ofrecidos</strong> a futuro con el filtro actual. Crea o publica la línea de
					atención, o ajusta el &quot;rellenar agenda&quot; (pestaña Citas → mantenimiento) si aplica.
				</p>
			) : null}
			{!agendaLoading && mode === 'unified' && events.length === 0 ? (
				<p className="my-2 text-muted-foreground">
					Aún no hay nada en el calendario: <strong>sin tramos ofrecidos</strong> a futuro o{' '}
					<strong>sin citas</strong> (confirmadas / pendientes). Crea una línea de atención y, si aplica, usa
					el mantenimiento de agenda (rellenar) debajo.
				</p>
			) : null}

			{/* Legend */}
			{mode === 'citas' && !citasLoading && events.length > 0 ? (
				<p className="mt-1.5 mb-0.5 flex flex-wrap items-center gap-2 text-[0.78rem] text-muted-foreground">
					<span className="inline-flex items-center gap-1.5">
						<span className={swatchBook} />
						Reservas (dueño y mascota)
					</span>
				</p>
			) : null}
			{mode === 'oferta' && !agendaLoading && events.length > 0 ? (
				<p className="mt-1.5 mb-0.5 flex flex-wrap items-center gap-2 text-[0.78rem] text-muted-foreground">
					<span className="inline-flex items-center gap-1.5">
						<span className={swatchSlot} />
						Tramo ofrecido (puedes Cerrar, Abrir o Quitar)
					</span>
				</p>
			) : null}
			{mode === 'unified' && !agendaLoading && events.length > 0 ? (
				<p className="mt-1.5 mb-0.5 flex flex-wrap items-center gap-3 text-[0.78rem] text-muted-foreground">
					<span className="inline-flex items-center gap-1.5">
						<span className={swatchBook} /> Citas
					</span>
					<span className="inline-flex items-center gap-1.5">
						<span className={swatchSlot} /> Oferta (turno aún reservable)
					</span>
				</p>
			) : null}

			{/* Day view */}
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

			{/* Week view */}
			{view === 'week' && (
				<div className="grid grid-cols-7 gap-1.5 max-[900px]:grid-cols-1">
					{weekDays.map((d) => {
						const ymd = ymdForGrid(d);
						const isToday = ymd === todayYmd;
						const list = byYmd[ymd] || [];
						return (
							<div
								key={ymd}
								className={cn(
									'min-h-24 rounded-[0.4rem] border bg-[#fafbfc] p-1.5 dark:bg-card',
									isToday
										? 'border-primary shadow-[0_0_0_1px_rgba(13,148,136,0.25)]'
										: 'border-border'
								)}
							>
								<div className="mb-1.5">
									<small className="text-muted-foreground">
										{WEEKDAYS[(d.getDay() + 6) % 7]}{' '}
										<strong>{d.getDate()}</strong>
									</small>
								</div>
								<ul className="m-0 list-none p-0">
									{list.length === 0 ? (
										<li className="text-[0.8rem] text-muted-foreground">—</li>
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

			{/* Month view */}
			{view === 'month' && (
				<div className="mt-2" role="grid" aria-label="Vista mensual">
					<div className="mb-1 grid grid-cols-7 gap-1" aria-hidden>
						{WEEKDAYS.map((d) => (
							<div key={d} className="text-[0.7rem] font-semibold uppercase text-muted-foreground">
								{d}
							</div>
						))}
					</div>
					{monthMatrix.weeks.map((row, ri) => (
						<div key={ri} className="mb-1 grid grid-cols-7 gap-1">
							{row.map((d) => {
								const inMonth = d.getMonth() === monthMatrix.mon;
								const ymd = ymdForGrid(d);
								const isToday = ymd === todayYmd;
								const list = (byYmd[ymd] || []).slice(0, 3);
								return (
									<div
										key={ymd}
										className={cn(
											'min-h-[4.5rem] rounded-[0.3rem] border p-[0.2rem_0.25rem] text-[0.72rem] bg-white dark:bg-card',
											isToday ? 'border-primary' : 'border-border',
											!inMonth && 'opacity-40'
										)}
									>
										<div className="mb-0.5 font-bold">{d.getDate()}</div>
										<ul className="m-0 list-none p-0">
											{list.map((e) => (
												<li
													key={e.id}
													className={cn(
														'overflow-hidden text-ellipsis whitespace-nowrap py-0.5',
														e.kind === 'slot'
															? 'bg-[color-mix(in_srgb,var(--app-primary)_10%,#f8fafc)] border border-dashed border-[color-mix(in_srgb,var(--app-primary)_30%,#e2e8f0)] text-[0.68rem] rounded-sm px-0.5'
															: ''
													)}
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
												<li className="text-[0.75rem] text-muted-foreground">
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
				<p className="m-0 text-muted-foreground">
					{ymd === todayYmd ? 'Sin reservas este día.' : 'Sin reservas el ' + ymd + '.'}
				</p>
			);
		}
		if (calendarMode === 'oferta') {
			return (
				<p className="m-0 text-muted-foreground">
					{ymd === todayYmd
						? 'Sin tramos ofrecidos este día (revisa otra semana o el filtro de línea).'
						: 'Sin oferta el ' + ymd + '.'}
				</p>
			);
		}
		return (
			<p className="m-0 text-muted-foreground">
				{ymd === todayYmd
					? 'Nada en este día (ni oferta de tramo ni cita con cliente).'
					: 'No hay ítems el día ' + ymd + '.'}
			</p>
		);
	}
	return (
		<ul className="m-0 list-none p-0">
			{list.map((e) => (
				<li key={e.id} className="mb-2.5">
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
		<div
			className={cn(
				'mb-1.5 rounded-[0.35rem] border p-[0.3rem_0.35rem]',
				isSlot
					? 'border-dashed border-[color-mix(in_srgb,var(--app-primary)_32%,#cbd5e1)] bg-[color-mix(in_srgb,var(--app-primary)_7%,#fff)] dark:bg-primary/10'
					: 'border-border bg-white dark:bg-card'
			)}
		>
			<div className="text-[0.78rem] font-semibold text-foreground">
				{formatTimeInChile(e.startAt)} – {formatTimeInChile(e.endAt)}
			</div>
			<div className="text-[0.8rem] font-semibold text-primary">{e.line}</div>
			<div className="text-[0.8rem] text-foreground">
				{isSlot ? <em className="not-italic text-muted-foreground">{e.client}</em> : e.client}
			</div>
			<small className="text-muted-foreground">{e.status}</small>
			{isSlot && e.slotId && (onSlotBlock || onSlotUnblock || onSlotDelete) ? (
				<div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Gestionar tramo">
					{e.slotStatus === 'available' && onSlotBlock ? (
						<button
							type="button"
							className="cursor-pointer rounded-lg border border-border bg-white px-2.5 py-1 text-[0.82rem] text-foreground hover:bg-muted dark:bg-card"
							onClick={() => onSlotBlock(e.slotId)}
						>
							Cerrar
						</button>
					) : null}
					{e.slotStatus === 'blocked' && onSlotUnblock ? (
						<button
							type="button"
							className="cursor-pointer rounded-lg border border-border bg-white px-2.5 py-1 text-[0.82rem] text-foreground hover:bg-muted dark:bg-card"
							onClick={() => onSlotUnblock(e.slotId)}
						>
							Abrir
						</button>
					) : null}
					{onSlotDelete ? (
						<button
							type="button"
							className="cursor-pointer rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[0.82rem] font-bold text-red-800 hover:bg-red-50 dark:bg-transparent dark:border-red-800 dark:text-red-300"
							onClick={() => onSlotDelete(e.slotId)}
						>
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
