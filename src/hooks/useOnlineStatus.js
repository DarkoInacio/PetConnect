import { useSyncExternalStore } from 'react';

function subscribe(callback) {
	window.addEventListener('online', callback);
	window.addEventListener('offline', callback);
	return () => {
		window.removeEventListener('online', callback);
		window.removeEventListener('offline', callback);
	};
}

function getSnapshot() {
	return typeof navigator !== 'undefined' && navigator.onLine;
}

function getServerSnapshot() {
	return true;
}

/** Estado de red del navegador (actualiza en online/offline). */
export function useOnlineStatus() {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
