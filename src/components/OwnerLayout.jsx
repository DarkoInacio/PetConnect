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
		<div className={`page owner-area${subnavSuppressed ? ' owner-area--flow-focus' : ''}`}>
			<Link className="back-link" to="/">
				← Volver al mapa
			</Link>
			<header className="owner-area__head">
				<p className="owner-area__eyebrow">Tu cuenta</p>
			</header>
			{!subnavSuppressed ? <OwnerSubnav /> : null}
			<Outlet context={{ setSubnavSuppressed, ownerHubBase: '/cuenta' }} />
		</div>
	);
}
