import { test, expect } from '@playwright/test';
import { mockOwnerSession } from './helpers/apiMocks.js';

test.describe('Mascotas dueño', () => {
	test.beforeEach(async ({ page }) => {
		await mockOwnerSession(page);
	});

	test('muestra lista de mascotas tras login', async ({ page }) => {
		await page.goto('/login');
		await page.locator('#login-email').fill('dueno1@petconnect.test');
		await page.locator('#login-password').fill('QaTest2026!');
		await page.getByRole('button', { name: /entrar/i }).click();
		await page.goto('/cuenta/mascotas');

		await expect(page.getByText('Firulais')).toBeVisible();
		await expect(page.getByRole('link', { name: /ver ficha/i })).toBeVisible();
	});
});
