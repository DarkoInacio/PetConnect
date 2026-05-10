import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		VitePWA({
			registerType: 'autoUpdate',
			injectRegister: false,
			includeAssets: [
				'icons.svg',
				'chat-fab-icon.png',
				'chatbot-avatar.png',
				'pwa-192.png',
				'pwa-512.png'
			],
			manifest: {
				id: '/',
				name: 'PetConnect',
				short_name: 'PetConnect',
				description:
					'PetConnect: conecta clínicas veterinarias con dueños. Reservas, mapa y ficha de salud de tu mascota.',
				theme_color: '#C06C44',
				background_color: '#FFF9F1',
				display: 'standalone',
				display_override: ['standalone', 'browser'],
				scope: '/',
				start_url: '/',
				lang: 'es',
				dir: 'ltr',
				orientation: 'portrait-primary',
				categories: ['medical', 'lifestyle'],
				icons: [
					{
						src: 'pwa-192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any'
					},
					{
						src: 'pwa-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any'
					},
					{
						src: 'pwa-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
				navigateFallback: 'index.html',
				navigateFallbackDenylist: [/^\/api\//],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'petconnect-google-fonts',
							expiration: {
								maxEntries: 30,
								maxAgeSeconds: 60 * 60 * 24 * 365
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},
					{
						urlPattern: /^https:\/\/[a-z0-9.-]+\.tile\.openstreetmap\.org\/.*/i,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'petconnect-osm-tiles',
							expiration: {
								maxEntries: 80,
								maxAgeSeconds: 60 * 60 * 24 * 14
							},
							networkTimeoutSeconds: 8
						}
					}
				]
			},
			devOptions: {
				enabled: false
			}
		})
	],
	resolve: {
		alias: { '@': path.resolve(__dirname, 'src') }
	}
});
