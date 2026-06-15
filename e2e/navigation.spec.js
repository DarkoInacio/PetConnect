import { test, expect } from '@playwright/test';
import { mockPublicApi } from './helpers/apiMocks.js';

test.describe('Mapa público', () => {
	test.beforeEach(async ({ page }) => {
		await mockPublicApi(page);
	});

	test('carga el mapa y muestra menú de cuenta', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('button', { name: /menú de cuenta e inicio de sesión/i })).toBeVisible();
	});

	test('navega a login desde el menú de cuenta', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: /menú de cuenta e inicio de sesión/i }).click();
		await page.getByRole('menuitem', { name: /iniciar sesión/i }).click();
		await expect(page).toHaveURL(/\/login/);
		await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
	});
});
