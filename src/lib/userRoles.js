/** @param {any} user @param {string} role */
export function hasRole(user, role) {
	if (!user || !role) return false;
	if (user.role === role) return true;
	if (Array.isArray(user.roles) && user.roles.includes(role)) return true;
	return false;
}

/** JWT / sesión: administrador del sistema (API usa alias `administrador` y rol en BD `admin`). */
export function isAdministrator(user) {
	if (!user) return false;
	if (user.role === 'admin' || user.role === 'administrador') return true;
	if (Array.isArray(user.roles)) {
		return user.roles.some((r) => r === 'admin' || r === 'administrador');
	}
	return false;
}
