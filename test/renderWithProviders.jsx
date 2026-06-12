import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthProvider';

export function renderWithProviders(ui, { route = '/', withAuth = true } = {}) {
	const tree = withAuth ? <AuthProvider>{ui}</AuthProvider> : ui;
	return render(<MemoryRouter initialEntries={[route]}>{tree}</MemoryRouter>);
}
