import request from 'supertest';
import { createE2eApp, type E2eContext } from './e2e-app';

// Les catégories initiales sont créées par la migration add_categories :
// la base de test les contient donc sans préparation particulière.

describe('Catégories (e2e)', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await createE2eApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('liste les catégories par ordre alphabétique, sans connexion', async () => {
    const response = await request(ctx.app.getHttpServer())
      .get('/categories')
      .expect(200);

    const names = (response.body as { name: string }[]).map((c) => c.name);
    expect(names).toEqual([
      'Céréales',
      'Cultures de rente',
      'Élevage',
      'Fruits',
      'Légumes',
      'Légumineuses et oléagineux',
      'Produits transformés',
      'Tubercules',
    ]);
    expect(response.body[0]).toEqual({
      id: expect.any(String),
      name: 'Céréales',
      description: 'Riz, maïs, fonio, mil, sorgho',
      createdAt: expect.any(String),
    });
  });
});
