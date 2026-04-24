import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetTrigger } from './ui/sheet';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from './ui/dropdown-menu';
import { LogOut, Map, MapPin, Menu, User } from 'lucide-react';
import { hasRole } from '../lib/userRoles';

/**
 * @typedef {{ label: string, to: string, when?: (u: any) => boolean, icon?: any }} NavItem
 */

function navItemsForUser(user) {
	/** @type {NavItem[]} */
	const all = [
		{ label: 'Mapa', to: '/', when: () => true, icon: Map },
		{ label: 'Explorar clínicas', to: '/explorar', when: () => true, icon: MapPin },
		{ label: 'Proveedores', to: '/registro-proveedor', when: (u) => !u, icon: User },
		{
			label: 'Panel clínica',
			to: '/proveedor',
			when: (u) => hasRole(u, 'proveedor') && u?.providerType === 'veterinaria'
		},
		{
			label: 'Panel paseo / cuidado',
			to: '/proveedor',
			when: (u) => hasRole(u, 'proveedor') && u?.providerType !== 'veterinaria'
		},
		{
			label: 'Configuración de clínica',
			to: '/proveedor/mi-perfil',
			when: (u) => hasRole(u, 'proveedor') && u?.providerType === 'veterinaria'
		},
		{
			label: 'Configurar perfil',
			to: '/proveedor/mi-perfil',
			when: (u) => hasRole(u, 'proveedor') && u?.providerType !== 'veterinaria'
		},
		{ label: 'Mis reseñas', to: '/proveedor/mis-resenas', when: (u) => hasRole(u, 'proveedor') },
		{
			label: 'Atención clínica',
			to: '/proveedor/atencion-clinica',
			when: (u) => hasRole(u, 'proveedor') && u?.providerType === 'veterinaria'
		},
		{ label: 'Mis reservas', to: '/mis-reservas', when: (u) => hasRole(u, 'dueno') },
		{ label: 'Mascotas', to: '/mascotas', when: (u) => hasRole(u, 'dueno') },
		{ label: 'Citas', to: '/citas', when: (u) => hasRole(u, 'dueno') },
		{ label: 'Admin proveedores', to: '/admin/proveedores', when: (u) => hasRole(u, 'admin') },
		{ label: 'Reportes de reseñas', to: '/admin/resenas-reportes', when: (u) => hasRole(u, 'admin') }
	];
	return all.filter((i) => i.when(user));
}

export function AppLayoutHeader() {
	const { user, loading, logout } = useAuth();
	const location = useLocation();
	const [open, setOpen] = useState(false);
	const closeOnNavigate = (to) => {
		if (to !== location.pathname) setOpen(false);
	};

	const drawerItems = navItemsForUser(user);

	return (
		<header
			role="banner"
			className="sticky top-0 z-40 w-full min-h-12 border-b border-emerald-950/20 bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/90 text-slate-50 shadow-[0_1px_0_rgba(45,212,191,0.18)] supports-[backdrop-filter]:backdrop-blur-sm"
		>
			<div className="mx-auto flex min-h-[3rem] max-w-[1200px] items-center justify-between gap-2 px-3 sm:px-4">
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<Sheet open={open} onOpenChange={setOpen}>
						<SheetTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-11 w-11 shrink-0 text-slate-200 ring-offset-slate-900 hover:bg-slate-800/90 hover:text-teal-200"
								aria-label="Abrir menú de navegación"
							>
								<Menu className="h-5 w-5" aria-hidden />
							</Button>
						</SheetTrigger>
						<SheetContent
							side="left"
							className="w-[min(20rem,88vw)] border-r border-emerald-500/15 bg-slate-50 text-slate-900"
						>
							<SheetHeader className="pr-8 text-left">
								<SheetTitle className="text-base font-semibold">
									<span className="text-slate-800">Pet</span>
									<span className="text-teal-600">Connect</span>
								</SheetTitle>
							</SheetHeader>
							<nav
								id="navegacion-movil"
								className="mt-4 flex flex-col gap-0.5"
								role="navigation"
								aria-label="Navegación principal"
							>
								{drawerItems.map((item) => (
									<SheetClose asChild key={`${item.label}-${item.to}`}>
										<Link
											className="flex min-h-11 items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-emerald-50/90 hover:text-teal-800"
											to={item.to}
											onClick={() => closeOnNavigate(item.to)}
										>
											{item.icon ? <item.icon className="h-4 w-4 opacity-80 shrink-0" aria-hidden /> : null}
											{item.label}
										</Link>
									</SheetClose>
								))}
							</nav>
						</SheetContent>
					</Sheet>
					<Link
						className="truncate text-sm font-semibold tracking-tight no-underline transition hover:opacity-90 focus-visible:opacity-100"
						to="/"
						aria-label="PetConnect, ir al inicio (mapa)"
					>
						<span className="text-slate-100">Pet</span>
						<span className="text-teal-300">Connect</span>
					</Link>
				</div>

				<div className="flex shrink-0 items-center gap-2">
					{loading ? <span className="text-xs text-slate-400">…</span> : null}

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="secondary"
								size="sm"
								type="button"
								aria-label={
									!loading && user
										? 'Menú de cuenta, ' + (user.name || 'Usuario')
										: 'Menú de cuenta e inicio de sesión'
								}
								className="h-9 min-h-9 min-w-0 gap-1.5 border border-slate-600/90 bg-slate-800/95 px-2.5 text-slate-100 ring-offset-slate-900 hover:border-emerald-500/35 hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-400/50 sm:px-3"
							>
								<User className="h-4 w-4 shrink-0" aria-hidden />
								<span className="max-w-[7.5rem] truncate text-left text-xs sm:max-w-[10rem] sm:text-sm">
									{!loading && user ? (user.name || 'Usuario') : 'Cuenta'}
								</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="center" side="bottom" sideOffset={6} className="w-56">
							{!loading && !user ? (
								<DropdownMenuItem asChild>
									<Link to="/login">Iniciar sesión</Link>
								</DropdownMenuItem>
							) : null}
							{!loading && user && hasRole(user, 'dueno') ? (
								<DropdownMenuItem asChild>
									<Link to="/mi-perfil">Mi perfil</Link>
								</DropdownMenuItem>
							) : null}
							{!loading && user && hasRole(user, 'proveedor') ? (
								<DropdownMenuItem asChild>
									<Link to="/proveedor/mi-perfil">
										{user.providerType === 'veterinaria' ? 'Configuración de clínica' : 'Configurar perfil'}
									</Link>
								</DropdownMenuItem>
							) : null}
							{!loading && user && hasRole(user, 'admin') ? (
								<DropdownMenuItem asChild>
									<Link to="/admin/proveedores">Administración</Link>
								</DropdownMenuItem>
							) : null}
							{!loading && user ? (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										className="text-destructive focus:bg-destructive/10 focus:text-destructive"
										onSelect={() => {
											void logout();
										}}
									>
										<LogOut className="mr-2 h-4 w-4" />
										Salir
									</DropdownMenuItem>
								</>
							) : null}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</header>
	);
}
