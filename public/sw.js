/* Minimal Service Worker for PetConnect (app shell) */
const CACHE_NAME = 'petconnect-shell-v1';

// Cache the app shell (Vite will serve these). Keep minimal to avoid stale issues.
const SHELL_ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/chat-fab-icon.png', '/chatbot-avatar.png'];

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_NAME);
			await cache.addAll(SHELL_ASSETS);
			self.skipWaiting();
		})()
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
			self.clients.claim();
		})()
	);
});

// Network-first for navigation; cache-first for other requests.
self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;

	const url = new URL(req.url);
	const isSameOrigin = url.origin === self.location.origin;
	const isNavigation = req.mode === 'navigate';

	if (isNavigation) {
		event.respondWith(
			(async () => {
				try {
					return await fetch(req);
				} catch {
					const cache = await caches.open(CACHE_NAME);
					return (await cache.match('/')) || (await cache.match('/index.html'));
				}
			})()
		);
		return;
	}

	if (!isSameOrigin) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE_NAME);
			const cached = await cache.match(req);
			if (cached) return cached;
			const res = await fetch(req);
			// Cache static-ish assets only
			if (res.ok && (url.pathname.startsWith('/assets/') || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg'))) {
				cache.put(req, res.clone()).catch(() => {});
			}
			return res;
		})()
	);
});

