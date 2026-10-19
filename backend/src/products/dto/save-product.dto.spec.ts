import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SaveProductDto } from './save-product.dto';

// Reproduit ce que fait le ValidationPipe global : transformation puis validation
async function validateProduct(body: Record<string, unknown>) {
  const dto = plainToInstance(SaveProductDto, body);
  const errors = await validate(dto, { stopAtFirstError: true });
  const messages = Object.fromEntries(
    errors.map((error) => [
      error.property,
      Object.values(error.constraints ?? {})[0],
    ]),
  );
  return { dto, messages };
}

const validBody = {
  name: '  Riz local ',
  categoryId: '7b0e6f7c-3c1a-4c2e-9f5d-2a6b8e4d1c90',
  quantity: 2000,
  unit: 'KG',
  pricePerUnit: 8000,
  region: 'Kindia',
  prefecture: 'Forécariah',
  availableFrom: '2026-11-15',
  packaging: '',
};

describe('SaveProductDto', () => {
  it('accepte un produit valide et normalise les champs', async () => {
    const { dto, messages } = await validateProduct(validBody);

    expect(messages).toEqual({});
    expect(dto.name).toBe('Riz local');
    expect(dto.packaging).toBeUndefined();
  });

  it('rejette une quantité ou un prix non entier', async () => {
    const { messages } = await validateProduct({
      ...validBody,
      quantity: 1.5,
      pricePerUnit: '8000',
    });

    expect(messages).toEqual({
      quantity: 'La quantité doit être un nombre entier.',
      pricePerUnit: 'Le prix doit être un nombre entier de francs guinéens.',
    });
  });

  it('rejette une quantité ou un prix nul', async () => {
    const { messages } = await validateProduct({
      ...validBody,
      quantity: 0,
      pricePerUnit: 0,
    });

    expect(messages).toEqual({
      quantity: "La quantité doit être d'au moins 1.",
      pricePerUnit: "Le prix doit être d'au moins 1 GNF.",
    });
  });

  it('rejette une date mal formée ou impossible', async () => {
    const { messages } = await validateProduct({
      ...validBody,
      availableFrom: '15/11/2026',
      availableUntil: '2026-02-30',
    });

    expect(messages).toEqual({
      availableFrom: 'Date invalide (format AAAA-MM-JJ).',
      availableUntil: 'Date invalide.',
    });
  });

  it('rejette une unité inconnue', async () => {
    const { messages } = await validateProduct({ ...validBody, unit: 'BARIL' });

    expect(messages.unit).toBe('Unité invalide.');
  });

  it('signale chaque champ obligatoire manquant', async () => {
    const { messages } = await validateProduct({});

    expect(messages).toEqual({
      name: 'Le nom du produit est obligatoire.',
      categoryId: 'La catégorie est obligatoire.',
      quantity: 'La quantité est obligatoire.',
      unit: "L'unité est obligatoire.",
      pricePerUnit: 'Le prix est obligatoire.',
      region: 'La région est obligatoire.',
      prefecture: 'La préfecture est obligatoire.',
    });
  });
});
