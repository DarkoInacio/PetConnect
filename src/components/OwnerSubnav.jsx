import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../lib/userRoles';
import { cn } from '../lib/utils';

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
		<nav className="mb-5" aria-label="Secciones de tu cuenta" role="navigation">
			<div className="border border-border rounded-xl bg-card px-1.5 pb-1.5 pt-1">
				<ul className="flex flex-wrap gap-[0.4rem_0.45rem] list-none m-0 px-0.5 py-0.5">
					{items.map((item) => (
						<li key={item.to} className="m-0">
							<NavLink
								to={item.to}
								end={item.end === true}
								className={({ isActive }) =>
									cn(
										'inline-flex items-center justify-center min-h-[2.6rem] px-[0.95rem] py-[0.4rem] text-[0.9rem] font-semibold rounded-full no-underline transition-all',
										isActive
											? 'bg-primary text-primary-foreground border border-transparent shadow-sm'
											: 'text-muted-foreground bg-muted border border-border hover:bg-accent hover:text-accent-foreground'
									)
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
