import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../lib/userRoles';

export const OWNER_HUB = '/cuenta';

/**
 * Pestañas del área de dueño: cada sección es su propia ruta bajo /cuenta/…
 */
export function OwnerSubnav() {
	const { user } = useAuth();
	const items = useMemo(() => {
		/** @type {{ to: string, label: string, end: boolean }[]} */
		const list = [{ to: `${OWNER_HUB}/reservas`, label: 'Reservas', end: true }];
		if (user && hasRole(user, 'dueno') && !hasRole(user, 'proveedor')) {
			list.push({ to: `${OWNER_HUB}/ofrecer-servicios`, label: 'Ofrecer servicios', end: true });
		}
		list.push(
			{ to: `${OWNER_HUB}/perfil`, label: 'Mi perfil', end: true },
			{ to: `${OWNER_HUB}/mascotas`, label: 'Mascotas', end: true }
		);
		return list;
	}, [user]);
	return (
		<nav className="owner-subnav" aria-label="Secciones de tu cuenta" role="navigation">
			<div className="owner-subnav__bar">
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
			</div>
		</nav>
	);
}
