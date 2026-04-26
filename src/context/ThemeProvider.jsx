import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'petconnect-theme';

/** @typedef {'light' | 'dark' | 'system'} Theme */

const ThemeContext = createContext({
	theme: 'system',
	resolvedTheme: 'light',
	setTheme: () => {}
});

/** Detecta preferencia del sistema operativo */
function getSystemTheme() {
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children, defaultTheme = 'system' }) {
	const [theme, setThemeState] = useState(
		() => /** @type {Theme} */ (localStorage.getItem(STORAGE_KEY) ?? defaultTheme)
	);

	const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;

	useEffect(() => {
		const root = document.documentElement;
		root.classList.remove('light', 'dark');
		root.classList.add(resolvedTheme);
	}, [resolvedTheme]);

	/* Escucha cambios del sistema cuando el tema es "system" */
	useEffect(() => {
		if (theme !== 'system') return;
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const handler = () => {
			document.documentElement.classList.remove('light', 'dark');
			document.documentElement.classList.add(getSystemTheme());
		};
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	}, [theme]);

	function setTheme(next) {
		setThemeState(next);
		try {
			localStorage.setItem(STORAGE_KEY, next);
		} catch {
			// ignore
		}
	}

	return (
		<ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	return useContext(ThemeContext);
}
