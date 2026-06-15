import { test, expect } from '@playwright/test';
import { mockOwnerSession } from './helpers/apiMocks.js';

test.describe('Login dueño', () => {
	test.beforeEach(async ({ page }) => {
		await mockOwnerSession(page);
	});

	test('inicia sesión y redirige al mapa', async ({ page }) => {
		await page.goto('/login');
		await page.locator('#login-email').fill('dueno1@petconnect.test');
		await page.locator('#login-password').fill('QaTest2026!');
		await page.getByRole('button', { name: /entrar/i }).click();

		await expect(page).toHaveURL('/');
		await expect(page.getByRole('button', { name: /menú de cuenta/i })).toBeVisible();
	});
});
