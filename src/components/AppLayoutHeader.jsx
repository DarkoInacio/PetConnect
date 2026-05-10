import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeProvider';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetTrigger } from './ui/sheet';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from './ui/dropdown-menu';
import { LayoutGrid, LogOut, Map, MapPin, Menu, Moon, Sun, User } from 'lucide-react';
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
			label: 'Ficha y agenda de clínica',
			to: '/proveedor/mi-perfil',
			when: (u) => hasRole(u, 'proveedor') && u?.providerType === 'veterinaria'
		},
		{
			label: 'Ficha, tarifas y disponibilidad',
			to: '/proveedor/mi-perfil',
			when: (u) => hasRole(u, 'proveedor') && u?.providerType !== 'veterinaria'
		},
		{ label: 'Mis reseñas', to: '/proveedor/mis-resenas', when: (u) => hasRole(u, 'proveedor') },
		{
			label: 'Mi cuenta',
			to: '/cuenta/reservas',
			when: (u) => hasRole(u, 'dueno'),
			icon: LayoutGrid
		},
		{ label: 'Gestión de proveedores', to: '/admin/proveedores', when: (u) => hasRole(u, 'admin') },
		{ label: 'Reportes de reseñas', to: '/admin/resenas-reportes', when: (u) => hasRole(u, 'admin') }
	];
	return all.filter((i) => i.when(user));
}

export function AppLayoutHeader() {
	const { user, loading, logout } = useAuth();
	const { resolvedTheme, setTheme } = useTheme();
	const location = useLocation();
	const [open, setOpen] = useState(false);
	const closeOnNavigate = (to) => {
		if (to !== location.pathname) setOpen(false);
	};

	const isDark = resolvedTheme === 'dark';
	const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

	const drawerItems = navItemsForUser(user);

	return (
		<header
			role="banner"
			className="sticky top-0 z-[1100] w-full min-h-12 border-b border-primary/30 bg-foreground text-background shadow-[0_1px_0_hsl(var(--primary)/0.22)] supports-[backdrop-filter]:backdrop-blur-sm dark:border-primary/25 dark:bg-card dark:text-card-foreground dark:shadow-[0_1px_0_hsl(var(--primary)/0.15)]"
		>
			<div className="mx-auto flex min-h-[3rem] max-w-[1200px] items-center justify-between gap-2 px-3 sm:px-4">
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<Sheet open={open} onOpenChange={setOpen}>
						<SheetTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-11 w-11 shrink-0 text-inherit ring-offset-background hover:bg-background/15 hover:text-inherit dark:ring-offset-card dark:hover:bg-foreground/10"
								aria-label="Abrir menú de navegación"
							>
								<Menu className="h-5 w-5" aria-hidden />
							</Button>
						</SheetTrigger>
						<SheetContent
							side="left"
							className="w-[min(20rem,88vw)] border-r border-border bg-card text-card-foreground"
						>
							<SheetHeader className="pr-8 text-left">
								<SheetTitle className="text-base font-semibold">
									<span className="text-foreground">Pet</span>
									<span className="text-primary">Connect</span>
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
											className="flex min-h-11 items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
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
						<span className="text-background/95 dark:text-card-foreground">Pet</span>
						<span className="text-primary">Connect</span>
					</Link>
				</div>

			<div className="flex shrink-0 items-center gap-2">
				{loading ? <span className="text-xs text-background/60 dark:text-muted-foreground">…</span> : null}

				<Button
					variant="ghost"
					size="icon"
					type="button"
					onClick={toggleTheme}
					aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
					className="h-9 w-9 shrink-0 text-inherit ring-offset-background hover:bg-background/15 dark:ring-offset-card dark:hover:bg-foreground/10"
				>
					{isDark ? (
						<Sun className="h-4 w-4" aria-hidden />
					) : (
						<Moon className="h-4 w-4" aria-hidden />
					)}
				</Button>

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
								className="h-9 min-h-9 min-w-0 gap-1.5 border border-background/25 bg-background/12 px-2.5 text-inherit shadow-none ring-offset-background hover:border-primary/50 hover:bg-background/22 focus-visible:ring-2 focus-visible:ring-primary/50 sm:px-3 dark:border-border dark:bg-muted/60 dark:text-card-foreground dark:ring-offset-card dark:hover:border-primary/40 dark:hover:bg-muted"
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
									<Link to="/cuenta/perfil">Mi perfil</Link>
								</DropdownMenuItem>
							) : null}
							{!loading && user && hasRole(user, 'proveedor') ? (
								<DropdownMenuItem asChild>
									<Link to="/proveedor">
										{user.providerType === 'veterinaria' ? 'Panel clínica' : 'Panel paseo / cuidado'}
									</Link>
								</DropdownMenuItem>
							) : null}
							{!loading && user && hasRole(user, 'proveedor') ? (
								<DropdownMenuItem asChild>
									<Link to="/proveedor/mi-perfil">
										{user.providerType === 'veterinaria'
											? 'Ficha y agenda de clínica'
											: 'Ficha, tarifas y disponibilidad'}
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
