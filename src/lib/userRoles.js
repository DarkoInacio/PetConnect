/** @param {any} user @param {string} role */
export function hasRole(user, role) {
	if (!user || !role) return false;
	if (user.role === role) return true;
	if (Array.isArray(user.roles) && user.roles.includes(role)) return true;
	return false;
}
