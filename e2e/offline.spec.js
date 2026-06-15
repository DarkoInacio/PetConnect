import { test, expect } from '@playwright/test';
import { mockPublicApi } from './helpers/apiMocks.js';

test.describe('PWA offline', () => {
	test('muestra banner sin conexión', async ({ page, context }) => {
		await mockPublicApi(page);
		await page.goto('/');
		await context.setOffline(true);
		await expect(page.getByRole('alert').filter({ hasText: /sin conexión/i }).first()).toBeVisible({
			timeout: 10_000
		});
	});
});
