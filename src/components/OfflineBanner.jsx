import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

/**
 * Barra fija bajo el header cuando no hay red: mantiene el shell de la PWA con aviso claro (criterio offline).
 */
export function OfflineBanner() {
	const online = useOnlineStatus();
	if (online) return null;

	return (
		<div
			className="shrink-0 border-b border-amber-500/40 bg-amber-50 px-4 py-2.5 text-center text-sm font-medium text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-100"
			role="alert"
			aria-live="polite"
		>
			<span className="inline-flex items-center justify-center gap-2">
				<WifiOff className="size-4 shrink-0 opacity-90" aria-hidden />
				Sin conexión. Algunas funciones no están disponibles.
			</span>
		</div>
	);
}
