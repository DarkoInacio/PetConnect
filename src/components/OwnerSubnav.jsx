import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../lib/userRoles';

/**
 * Pestañas/segmentos de navegación para el área de dueño.
 */
export function OwnerSubnav() {
	const { user } = useAuth();
	const items = useMemo(() => {
		/** @type {{ to: string, label: string, end: boolean }[]} */
		const list = [
			{ to: '/mis-reservas', label: 'Mis reservas', end: true },
			{ to: '/citas', label: 'Citas', end: true }
		];
		if (user && hasRole(user, 'dueno') && !hasRole(user, 'proveedor')) {
			list.push({ to: '/mi-perfil/ofrecer-servicios', label: 'Ofrecer servicios', end: true });
		}
		list.push(
			{ to: '/mi-perfil', label: 'Mi perfil', end: true },
			{ to: '/mascotas', label: 'Mascotas', end: false }
		);
		return list;
	}, [user]);
	return (
		<nav className="owner-subnav" aria-label="Secciones de tu cuenta">
			<ul className="owner-subnav__list">
				{items.map((item) => (
					<li key={item.to} className="owner-subnav__item">
						<NavLink
							to={item.to}
							end={item.end === true}
							className={({ isActive }) =>
								isActive ? 'owner-subnav__link is-active' : 'owner-subnav__link'
							}
						>
							{item.label}
						</NavLink>
					</li>
				))}
			</ul>
		</nav>
	);
}
