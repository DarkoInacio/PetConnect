import { beforeEach, describe, expect, it } from 'vitest';
import {
	getBackendOrigin,
	getStoredAuthToken,
	resolveBackendAssetUrl,
	setStoredAuthToken
} from './api';

describe('api helpers', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('guarda y lee token en localStorage', () => {
		setStoredAuthToken('jwt-test');
		expect(getStoredAuthToken()).toBe('jwt-test');
	});

	it('elimina token al pasar null', () => {
		setStoredAuthToken('jwt-test');
		setStoredAuthToken(null);
		expect(getStoredAuthToken()).toBeNull();
	});

	it('resuelve origen del backend sin /api', () => {
		expect(getBackendOrigin()).toMatch(/localhost:3000$/);
	});

	it('resuelve URL de asset relativa al backend', () => {
		const url = resolveBackendAssetUrl('/uploads/pet.jpg');
		expect(url).toBe(`${getBackendOrigin()}/uploads/pet.jpg`);
	});

	it('devuelve URL absoluta sin modificar', () => {
		expect(resolveBackendAssetUrl('https://cdn.example.com/a.png')).toBe(
			'https://cdn.example.com/a.png'
		);
	});
});
