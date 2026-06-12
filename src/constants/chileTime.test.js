import { describe, expect, it } from 'vitest';
import {
	addCalendarDaysYmd,
	formatCivilDateDisplayUtc,
	getYmdInChile,
	toDateInputStringUtc
} from './chileTime';

describe('chileTime', () => {
	it('suma días en YYYY-MM-DD', () => {
		expect(addCalendarDaysYmd('2026-06-10', 1)).toBe('2026-06-11');
		expect(addCalendarDaysYmd('2026-06-10', -1)).toBe('2026-06-09');
	});

	it('devuelve YMD en Chile para instante UTC conocido', () => {
		// 2026-06-12 03:00 UTC ≈ 2026-06-11 23:00 Chile (UTC-4)
		expect(getYmdInChile('2026-06-12T03:00:00.000Z')).toBe('2026-06-11');
	});

	it('formatea input date en UTC', () => {
		expect(toDateInputStringUtc('2026-03-15T00:00:00.000Z')).toBe('2026-03-15');
	});

	it('muestra fecha civil en UTC', () => {
		expect(formatCivilDateDisplayUtc('2026-03-15T00:00:00.000Z')).toMatch(/15/);
		expect(formatCivilDateDisplayUtc('invalid')).toBe('—');
	});
});
