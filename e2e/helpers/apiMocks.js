const MOCK_OWNER = {
	_id: '64f000000000000000000001',
	email: 'dueno1@petconnect.test',
	name: 'Dueño',
	lastName: 'Uno',
	role: 'dueno',
	roles: ['dueno'],
	status: 'activo'
};

const MOCK_PET = {
	_id: '64f000000000000000000010',
	name: 'Firulais',
	species: 'perro',
	breed: 'Mestizo',
	sex: 'macho',
	status: 'active'
};

/**
 * @param {import('@playwright/test').Page} page
 */
export async function mockPublicApi(page) {
	await page.route('**/api/proveedores/mapa**', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ markers: [], total: 0 })
		});
	});

	await page.route('**/api/proveedores/buscar**', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ resultados: [], total: 0, pagina: 1 })
		});
	});
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function mockOwnerSession(page) {
	await page.route('**/api/auth/login', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ token: 'e2e-token', user: MOCK_OWNER })
		});
	});

	await page.route('**/api/profile/me', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ user: MOCK_OWNER })
		});
	});

	await page.route('**/api/pets**', async (route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ pets: [MOCK_PET] })
			});
			return;
		}
		await route.continue();
	});
}

export { MOCK_OWNER, MOCK_PET };
