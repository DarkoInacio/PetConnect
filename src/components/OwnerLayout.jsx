import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { OwnerSubnav } from './OwnerSubnav';

/**
 * Contenedor del área "Tu cuenta" (dueño): pestañas fijas y contenido; al abrir el modal de
 * reseña (Outlet context) se oculta el submenú para no mezclar tareas.
 */
export function OwnerLayout() {
	const [subnavSuppressed, setSubnavSuppressed] = useState(false);

	return (
		<div className="mx-auto w-full max-w-5xl px-4 sm:px-5 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
			<Link
				className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline min-h-11 mb-4"
				to="/"
			>
				← Volver al mapa
			</Link>
			<header className={`my-0 mb-2${subnavSuppressed ? ' opacity-60 pointer-events-none' : ''}`}>
				<p className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70 mb-0.5">
					Tu cuenta
				</p>
			</header>
			{!subnavSuppressed ? <OwnerSubnav /> : null}
			<Outlet context={{ setSubnavSuppressed, ownerHubBase: '/cuenta' }} />
		</div>
	);
}
