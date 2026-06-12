import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
	it('combina clases con tailwind-merge', () => {
		expect(cn('px-2', 'px-4', 'text-sm')).toBe('px-4 text-sm');
	});

	it('ignora valores falsy', () => {
		expect(cn('base', false && 'hidden', null, 'extra')).toBe('base extra');
	});
});
