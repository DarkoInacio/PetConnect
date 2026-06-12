import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useOnlineStatus } from './useOnlineStatus';

function setOnline(value) {
	Object.defineProperty(window.navigator, 'onLine', {
		configurable: true,
		value
	});
	window.dispatchEvent(new Event(value ? 'online' : 'offline'));
}

describe('useOnlineStatus', () => {
	it('refleja navigator.onLine', () => {
		setOnline(true);
		const { result, rerender } = renderHook(() => useOnlineStatus());
		expect(result.current).toBe(true);

		setOnline(false);
		rerender();
		expect(result.current).toBe(false);
	});
});
