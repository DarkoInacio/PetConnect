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

/**
 * @typedef {{ label: string, to: string, when?: (u: any) => boolean, icon?: any }} NavItem
 */

function navItemsForUser(user) {
	/** @type {NavItem[]} */
	const all = [
		{ label: 'Mapa', to: '/', when: () => true, icon: Map },
		{ label: 'Explorar clínicas', to: '/explorar', when: () => true, icon: MapPin },
		{ label: 'Proveedores', to: '/registro-proveedor', when: (u) => !u, icon: User },
		{ label: 'Panel clínica', to: '/proveedor', when: (u) => u?.role === 'proveedor' && u?.providerType === 'veterinaria' },
		{ label: 'Panel paseo / cuidado', to: '/proveedor', when: (u) => u?.role === 'proveedor' && u?.providerType !== 'veterinaria' },
		{ label: 'Configuración de clínica', to: '/proveedor/mi-perfil', when: (u) => u?.role === 'proveedor' && u?.providerType === 'veterinaria' },
		{ label: 'Configurar perfil', to: '/proveedor/mi-perfil', when: (u) => u?.role === 'proveedor' && u?.providerType !== 'veterinaria' },
		{ label: 'Mis reseñas', to: '/proveedor/mis-resenas', when: (u) => u?.role === 'proveedor' },
		{ label: 'Atención clínica', to: '/proveedor/atencion-clinica', when: (u) => u?.role === 'proveedor' && u?.providerType === 'veterinaria' },
		{ label: 'Mis reservas', to: '/mis-reservas', when: (u) => u?.role === 'dueno' },
		{ label: 'Mascotas', to: '/mascotas', when: (u) => u?.role === 'dueno' },
		{ label: 'Citas (legacy)', to: '/citas', when: (u) => u?.role === 'dueno' },
		{ label: 'Admin proveedores', to: '/admin/proveedores', when: (u) => u?.role === 'admin' },
		{ label: 'Reportes de reseñas', to: '/admin/resenas-reportes', when: (u) => u?.role === 'admin' }
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
		<header className="sticky top-0 z-40 w-full border-b border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-900/95 text-slate-50 shadow-[0_1px_0_rgba(45,212,191,0.12)] supports-[backdrop-filter]:backdrop-blur-sm">
			<div className="mx-auto flex h-12 max-w-[1200px] items-center justify-between gap-2 px-3 sm:px-4">
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<Sheet open={open} onOpenChange={setOpen}>
						<SheetTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="shrink-0 text-slate-200 hover:bg-slate-800/90 hover:text-teal-200"
								aria-label="Abrir menú"
							>
								<Menu className="h-5 w-5" />
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
							<nav className="mt-4 flex flex-col gap-0.5" role="navigation">
								{drawerItems.map((item) => (
									<SheetClose asChild key={`${item.label}-${item.to}`}>
										<Link
											className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-800 hover:bg-emerald-50/90 hover:text-teal-800"
											to={item.to}
											onClick={() => closeOnNavigate(item.to)}
										>
											{item.icon ? <item.icon className="h-4 w-4 opacity-80" /> : null}
											{item.label}
										</Link>
									</SheetClose>
								))}
							</nav>
						</SheetContent>
					</Sheet>
					<Link
						className="truncate text-sm font-semibold tracking-tight no-underline transition hover:opacity-90"
						to="/"
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
								className="h-8 min-w-0 gap-1.5 border border-slate-600/90 bg-slate-800/95 px-2.5 text-slate-100 hover:border-emerald-500/35 hover:bg-slate-800 focus-visible:ring-emerald-500/40 sm:px-3"
							>
								<User className="h-4 w-4 shrink-0" />
								<span className="max-w-[7.5rem] truncate text-left text-xs sm:max-w-[10rem] sm:text-sm">
									{!loading && user
										? [user.name, user.role === 'dueno' ? 'dueño' : user.role === 'proveedor' ? (user.providerType === 'veterinaria' ? 'veterinaria' : 'proveedor') : user.role].filter(Boolean).join(' · ')
										: 'Cuenta'}
								</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="center" side="bottom" sideOffset={6} className="w-56">
							{!loading && !user ? (
								<DropdownMenuItem asChild>
									<Link to="/login">Iniciar sesión</Link>
								</DropdownMenuItem>
							) : null}
							{!loading && user && user.role === 'dueno' ? (
								<DropdownMenuItem asChild>
									<Link to="/mi-perfil">Mi perfil (dueño)</Link>
								</DropdownMenuItem>
							) : null}
							{!loading && user && user.role === 'proveedor' ? (
								<DropdownMenuItem asChild>
									<Link to="/proveedor/mi-perfil">
										{user.providerType === 'veterinaria' ? 'Configuración de clínica' : 'Configurar perfil'}
									</Link>
								</DropdownMenuItem>
							) : null}
							{!loading && user && user.role === 'admin' ? (
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
