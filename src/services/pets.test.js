import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { createPet, listPets, markPetDeceased } from './pets';

vi.mock('./api', () => ({
	api: {
		get: vi.fn(),
		post: vi.fn(),
		patch: vi.fn()
	}
}));

describe('pets service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('listPets consulta GET /pets', async () => {
		api.get.mockResolvedValueOnce({ data: { pets: [{ _id: '1', name: 'Luna' }] } });

		const data = await listPets({ forAgenda: 1 });

		expect(api.get).toHaveBeenCalledWith('/pets', { params: { forAgenda: 1 }, signal: undefined });
		expect(data.pets).toHaveLength(1);
	});

	it('createPet arma FormData con campos obligatorios', async () => {
		api.post.mockResolvedValueOnce({ data: { pet: { _id: '9', name: 'Toby' } } });

		await createPet({ name: 'Toby', species: 'perro', sex: 'macho' });

		expect(api.post).toHaveBeenCalledTimes(1);
		const [url, formData] = api.post.mock.calls[0];
		expect(url).toBe('/pets');
		expect(formData.get('name')).toBe('Toby');
		expect(formData.get('species')).toBe('perro');
		expect(formData.get('sex')).toBe('macho');
	});

	it('markPetDeceased llama PATCH mark-deceased', async () => {
		api.patch.mockResolvedValueOnce({ data: { pet: { status: 'deceased' } } });

		await markPetDeceased('pet-123');

		expect(api.patch).toHaveBeenCalledWith('/pets/pet-123/mark-deceased');
	});
});
