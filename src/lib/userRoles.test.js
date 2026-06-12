import { describe, expect, it } from 'vitest';
import { hasRole, isAdministrator } from './userRoles';

describe('userRoles', () => {
	describe('hasRole', () => {
		it('detecta rol principal', () => {
			expect(hasRole({ role: 'dueno' }, 'dueno')).toBe(true);
		});

		it('detecta rol en array roles', () => {
			expect(hasRole({ role: 'dueno', roles: ['dueno', 'proveedor'] }, 'proveedor')).toBe(true);
		});

		it('responde false sin usuario o rol', () => {
			expect(hasRole(null, 'dueno')).toBe(false);
			expect(hasRole({ role: 'dueno' }, '')).toBe(false);
		});
	});

	describe('isAdministrator', () => {
		it('reconoce admin por role', () => {
			expect(isAdministrator({ role: 'admin' })).toBe(true);
		});

		it('reconoce administrador en roles', () => {
			expect(isAdministrator({ role: 'dueno', roles: ['administrador'] })).toBe(true);
		});

		it('responde false para dueño', () => {
			expect(isAdministrator({ role: 'dueno', roles: ['dueno'] })).toBe(false);
		});
	});
});
