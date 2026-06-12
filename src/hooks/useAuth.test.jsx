import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAuth } from './useAuth';

describe('useAuth', () => {
	it('lanza error fuera de AuthProvider', () => {
		expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
	});
});
