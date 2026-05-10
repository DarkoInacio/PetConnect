import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import 'leaflet/dist/leaflet.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthProvider.jsx';
import { ThemeProvider } from './context/ThemeProvider.jsx';
import { registerSW } from 'virtual:pwa-register';

if (import.meta.env.PROD) {
	registerSW({ immediate: true });
}

createRoot(document.getElementById('root')).render(
	<StrictMode>
		<ThemeProvider defaultTheme="system">
			<AuthProvider>
				<App />
			</AuthProvider>
		</ThemeProvider>
	</StrictMode>
);
