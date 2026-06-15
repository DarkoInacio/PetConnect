import { test, expect } from '@playwright/test';
import { mockPublicApi } from './helpers/apiMocks.js';

test.describe('Recuperar contraseña', () => {
	test.beforeEach(async ({ page }) => {
		await mockPublicApi(page);
	});

	test('muestra formulario de recuperación', async ({ page }) => {
		await page.goto('/recuperar-clave');
		await expect(page.getByRole('heading', { name: /recuperar contraseña/i })).toBeVisible();
		await expect(page.getByLabel(/correo electrónico/i)).toBeVisible();
	});
});
