import request from 'supertest';
import { createE2eApp, resetDatabase, type E2eContext } from './e2e-app';

// Création d'un produit (parcours critique du cahier des charges §22),
// modification, changement de statut et contrôle de propriété.

const PASSWORD = 'motdepasse123';

const producerProfile = {
  farmType: 'CROPS',
  region: 'Kindia',
  prefecture: 'Forécariah',
};

describe('Produits du producteur (e2e)', () => {
  let ctx: E2eContext;
  let cerealsId: string;
  let vegetablesId: string;

  beforeAll(async () => {
    ctx = await createE2eApp();
    const categories = await ctx.prisma.category.findMany();
    cerealsId = categories.find((c) => c.name === 'Céréales')!.id;
    vegetablesId = categories.find((c) => c.name === 'Légumes')!.id;
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const api = () => request(ctx.app.getHttpServer());

  const rice = () => ({
    name: 'Riz local',
    categoryId: cerealsId,
    description: 'Riz étuvé, récolte 2026.',
    quantity: 2000,
    unit: 'KG',
    pricePerUnit: 8000,
    region: 'Kindia',
    prefecture: 'Forécariah',
    availableFrom: '2026-11-15',
    packaging: 'Sacs de 50 kg',
  });

  async function registerAs(
    roles: string[],
    phone: string,
  ): Promise<{ Authorization: string }> {
    const response = await api()
      .post('/auth/register')
      .send({ fullName: 'Fatoumata Sylla', phone, password: PASSWORD, roles })
      .expect(201);
    const token = (response.body as { accessToken: string }).accessToken;
    return { Authorization: `Bearer ${token}` };
  }

  async function registerProducer(phone = '622123456') {
    const auth = await registerAs(['PRODUCER'], phone);
    await api()
      .put('/producers/me')
      .set(auth)
      .send(producerProfile)
      .expect(200);
    return auth;
  }

  it('crée un produit puis le retrouve dans ses produits', async () => {
    const auth = await registerProducer();

    const created = await api()
      .post('/products')
      .set(auth)
      .send(rice())
      .expect(201);

    expect(created.body).toMatchObject({
      name: 'Riz local',
      quantity: 2000,
      unit: 'KG',
      pricePerUnit: 8000,
      status: 'AVAILABLE',
      availableFrom: '2026-11-15T00:00:00.000Z',
      availableUntil: null,
      category: { id: cerealsId, name: 'Céréales' },
    });

    const mine = await api().get('/products/mine').set(auth).expect(200);
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0].id).toBe(created.body.id);
  });

  it('exige un profil producteur complété', async () => {
    const auth = await registerAs(['PRODUCER'], '622123456');

    const response = await api()
      .post('/products')
      .set(auth)
      .send(rice())
      .expect(403);
    expect(response.body.message).toBe(
      'Complétez votre profil producteur avant de publier un produit.',
    );
  });

  it('refuse les comptes sans le rôle producteur', async () => {
    const auth = await registerAs(['BUYER'], '622123456');

    await api().post('/products').set(auth).send(rice()).expect(403);
    await api().get('/products/mine').set(auth).expect(403);
    await api().post('/products').send(rice()).expect(401);
  });

  it('remplace un produit et efface les champs facultatifs absents', async () => {
    const auth = await registerProducer();
    const created = await api()
      .post('/products')
      .set(auth)
      .send(rice())
      .expect(201);

    const {
      description: _d,
      packaging: _p,
      availableFrom: _a,
      ...rest
    } = rice();
    const replaced = await api()
      .put(`/products/${created.body.id}`)
      .set(auth)
      .send({
        ...rest,
        name: 'Tomates',
        categoryId: vegetablesId,
        quantity: 500,
        pricePerUnit: 12000,
      })
      .expect(200);

    expect(replaced.body).toMatchObject({
      id: created.body.id,
      name: 'Tomates',
      quantity: 500,
      pricePerUnit: 12000,
      description: null,
      packaging: null,
      availableFrom: null,
      category: { name: 'Légumes' },
    });
  });

  it('archive un produit puis le remet en vente', async () => {
    const auth = await registerProducer();
    const created = await api()
      .post('/products')
      .set(auth)
      .send(rice())
      .expect(201);

    const archived = await api()
      .patch(`/products/${created.body.id}/status`)
      .set(auth)
      .send({ status: 'ARCHIVED' })
      .expect(200);
    expect(archived.body.status).toBe('ARCHIVED');

    // Archivé, pas supprimé : il reste dans la liste du producteur
    const mine = await api().get('/products/mine').set(auth).expect(200);
    expect(mine.body).toHaveLength(1);

    await api()
      .patch(`/products/${created.body.id}/status`)
      .set(auth)
      .send({ status: 'AVAILABLE' })
      .expect(200);
  });

  it("ne permet pas de modifier le produit d'un autre producteur", async () => {
    const owner = await registerProducer('622123456');
    const other = await registerProducer('623987654');
    const created = await api()
      .post('/products')
      .set(owner)
      .send(rice())
      .expect(201);

    // 404 et non 403 : l'existence du produit n'est pas révélée
    await api()
      .put(`/products/${created.body.id}`)
      .set(other)
      .send(rice())
      .expect(404);
    await api()
      .patch(`/products/${created.body.id}/status`)
      .set(other)
      .send({ status: 'ARCHIVED' })
      .expect(404);
    await api().get('/products/mine').set(other).expect(200, []);
  });

  it('refuse une catégorie inconnue ou une période incohérente', async () => {
    const auth = await registerProducer();

    const unknownCategory = await api()
      .post('/products')
      .set(auth)
      .send({ ...rice(), categoryId: '00000000-0000-4000-8000-000000000000' })
      .expect(400);
    expect(unknownCategory.body.errors).toEqual({
      categoryId: 'Catégorie inconnue.',
    });

    const badPeriod = await api()
      .post('/products')
      .set(auth)
      .send({
        ...rice(),
        availableFrom: '2026-11-15',
        availableUntil: '2026-11-01',
      })
      .expect(400);
    expect(badPeriod.body.errors).toEqual({
      availableUntil:
        'La date de fin doit être postérieure à la date de début.',
    });

    expect(await ctx.prisma.product.count()).toBe(0);
  });
});
