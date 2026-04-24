/**
 * Instantáneas en UTC; la lógica de negocio es reloj de pared en Chile (misma
 * que AGENDA_TIMEZONE en el backend: America/Santiago).
 */
export const CL_TZ = 'America/Santiago';

/** Caché de formatos por clave (locale + options) */
const dtfCache = new Map();

function getDtf(options) {
	const key = JSON.stringify(options);
	if (!dtfCache.has(key)) {
		dtfCache.set(key, new Intl.DateTimeFormat('es-CL', options));
	}
	return dtfCache.get(key);
}

/**
 * Fecha + hora (Chile) — prefija Intl a `toLocaleString` (mejor soporte de `timeZone` en distintos navegadores)
 * @param {string|Date|number|undefined} isoOrDate
 * @returns {string}
 */
export function formatInChile(isoOrDate) {
	if (isoOrDate == null) return '—';
	const d = new Date(isoOrDate);
	if (Number.isNaN(d.getTime())) return '—';
	return getDtf({
		timeZone: CL_TZ,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: true
	}).format(d);
}

/**
 * Solo hora (Chile)
 * @param {string|Date|number|undefined} isoOrDate
 * @returns {string}
 */
export function formatTimeInChile(isoOrDate) {
	if (isoOrDate == null) return '—';
	const d = new Date(isoOrDate);
	if (Number.isNaN(d.getTime())) return '—';
	return getDtf({
		timeZone: CL_TZ,
		hour: '2-digit',
		minute: '2-digit',
		hour12: true
	}).format(d);
}

/**
 * Rango inicio – fin, ambos en hora Chile
 * @param {string|Date|undefined} startAt
 * @param {string|Date|undefined} endAt
 * @returns {string}
 */
/**
 * Fecha calendario (Año-mes-día) en la zona de Chile, para encasillar eventos.
 * @param {string|Date|number|undefined} isoOrDate
 * @returns {string | null} YYYY-MM-DD o null
 */
export function getYmdInChile(isoOrDate) {
	if (isoOrDate == null) return null;
	const d = new Date(isoOrDate);
	if (Number.isNaN(d.getTime())) return null;
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: CL_TZ,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(d);
}

export function formatChileDateTimeRange(startAt, endAt) {
	if (!startAt) return '—';
	try {
		const s = new Date(startAt);
		if (Number.isNaN(s.getTime())) return '—';
		const a = formatInChile(s);
		if (!endAt) return a;
		const e = new Date(endAt);
		if (Number.isNaN(e.getTime())) return a;
		const b = formatInChile(e);
		return `${a} — ${b}`;
	} catch {
		return '—';
	}
}
