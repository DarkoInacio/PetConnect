import { Link } from 'react-router-dom';

/**
 * Enlace principal entre inicio de sesión y registro (dueño) para reforzar el contexto de cada pantalla.
 */
export function AuthModeSwitch({ mode = 'login' }) {
	if (mode === 'register') {
		return (
			<div className="auth-footer-links">
				<p className="muted" style={{ margin: 0 }}>
					<span className="auth-mode-label">Inicio de sesión</span> — ¿Ya tienes cuenta?{' '}
					<Link to="/login">Entrar aquí</Link>
				</p>
			</div>
		);
	}
	return (
		<div className="auth-footer-links">
			<p className="muted" style={{ margin: '0 0 0.5rem' }}>
				<span className="auth-mode-label">Crear cuenta</span> — Si aún no estás en PetConnect,{' '}
				<Link to="/registro">regístrate como dueño</Link> o como{' '}
				<Link to="/registro-proveedor">proveedor (clínica, paseo, cuidado)</Link>.
			</p>
		</div>
	);
}
