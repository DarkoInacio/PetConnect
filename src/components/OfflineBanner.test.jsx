import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OfflineBanner } from './OfflineBanner';

function setOnline(value) {
	Object.defineProperty(window.navigator, 'onLine', {
		configurable: true,
		value
	});
	window.dispatchEvent(new Event(value ? 'online' : 'offline'));
}

describe('OfflineBanner', () => {
	it('no renderiza nada cuando hay conexión', () => {
		setOnline(true);
		const { container } = render(<OfflineBanner />);
		expect(container).toBeEmptyDOMElement();
	});

	it('muestra aviso cuando no hay conexión', () => {
		setOnline(false);
		render(<OfflineBanner />);
		expect(screen.getByRole('alert')).toHaveTextContent(/sin conexión/i);
	});
});
