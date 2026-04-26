import { Link } from 'react-router-dom';

export function AuthModeSwitch({ mode = 'login' }) {
	if (mode === 'register') {
		return (
			<div className="pt-4 border-t border-border">
				<p className="text-sm text-muted-foreground text-center m-0">
					¿Ya tienes cuenta?{' '}
					<Link to="/login" className="text-sm text-primary font-semibold hover:underline">
						Iniciar sesión
					</Link>
				</p>
			</div>
		);
	}
	return (
		<div className="pt-4 border-t border-border">
			<p className="text-sm text-muted-foreground text-center mb-1.5">
				¿Aún no tienes cuenta?
			</p>
			<div className="flex flex-col gap-1.5 text-center">
				<Link to="/registro" className="text-sm text-primary font-semibold hover:underline">
					Registrarme como dueño
				</Link>
				<Link to="/registro-proveedor" className="text-sm text-primary font-semibold hover:underline">
					Alta de proveedor (clínica, paseo, cuidado)
				</Link>
			</div>
		</div>
	);
}
