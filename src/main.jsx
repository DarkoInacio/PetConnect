import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import 'leaflet/dist/leaflet.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthProvider.jsx';
import { ThemeProvider } from './context/ThemeProvider.jsx';

createRoot(document.getElementById('root')).render(
	<StrictMode>
		<ThemeProvider defaultTheme="system">
			<AuthProvider>
				<App />
			</AuthProvider>
		</ThemeProvider>
	</StrictMode>
);
