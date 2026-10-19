import request from 'supertest';
import { createE2eApp, resetDatabase, type E2eContext } from './e2e-app';

// Catalogue public : recherche (parcours critique du cahier des charges §22),
// filtres, tri, pagination et détail d'un produit.

const PASSWORD = 'motdepasse123';

interface CatalogBody {
  items: { id: string; name: string }[];
  total: number;
  page: number;
  pageSize: number;
}

describe('Catalogue (e2e)', () => {
  let ctx: E2eContext;
  let cerealsId: string;
  let vegetablesId: string;
  // Identifiants des produits créés avant chaque test, par nom
  let ids: Record<string, string>;

  beforeAll(async () => {
    ctx = await createE2eApp();
    const categories = await ctx.prisma.category.findMany();
    cerealsId = categories.find((c) => c.name === 'Céréales')!.id;
    vegetablesId = categories.find((c) => c.name === 'Légumes')!.id;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const api = () => request(ctx.app.getHttpServer());

  async function registerProducer(
    phone: string,
    fullName: string,
    location: { region: string; prefecture: string },
  ) {
    const response = await api()
      .post('/auth/register')
      .send({ fullName, phone, password: PASSWORD, roles: ['PRODUCER'] })
      .expect(201);
    const auth = {
      Authorization: `Bearer ${(response.body as { accessToken: string }).accessToken}`,
    };
    await api()
      .put('/producers/me')
      .set(auth)
      .send({ farmType: 'CROPS', address: 'Adresse privée', ...location })
      .expect(200);
    return auth;
  }

  async function createProduct(
    auth: { Authorization: string },
    product: Record<string, unknown>,
    status?: string,
  ) {
    const response = await api()
      .post('/products')
      .set(auth)
      .send({
        unit: 'KG',
        region: 'Kindia',
        prefecture: 'Forécariah',
        ...product,
      })
      .expect(201);
    const id = (response.body as { id: string }).id;
    if (status) {
      await api()
        .patch(`/products/${id}/status`)
        .set(auth)
        .send({ status })
        .expect(200);
    }
    ids[product.name as string] = id;
  }

  // Les produits sont créés dans cet ordre : « recent » renvoie donc l'ordre inverse
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    ids = {};

    const kindia = await registerProducer('622123456', 'Mariama Touré', {
      region: 'Kindia',
      prefecture: 'Forécariah',
    });
    const labe = await registerProducer('623987654', 'Alpha Diallo', {
      region: 'Labé',
      prefecture: 'Labé',
    });

    await createProduct(kindia, {
      name: 'Riz local',
      categoryId: cerealsId,
      description: 'Riz étuvé, récolte 2026.',
      quantity: 2000,
      pricePerUnit: 8000,
    });
    await createProduct(labe, {
      name: 'Maïs jaune',
      categoryId: cerealsId,
      quantity: 3,
      unit: 'TONNE',
      pricePerUnit: 2_500_000,
      region: 'Labé',
      prefecture: 'Labé',
      availableFrom: '2099-01-01',
    });
    await createProduct(kindia, {
      name: 'Tomates',
      categoryId: vegetablesId,
      description: 'Tomates fraîches, 100% bio.',
      quantity: 500,
      pricePerUnit: 12000,
      prefecture: 'Coyah',
    });
    // Ne doivent jamais apparaître dans la liste
    await createProduct(
      kindia,
      {
        name: 'Oignons',
        categoryId: vegetablesId,
        quantity: 100,
        pricePerUnit: 9000,
      },
      'ARCHIVED',
    );
    await createProduct(
      kindia,
      {
        name: 'Gombo',
        categoryId: vegetablesId,
        quantity: 50,
        pricePerUnit: 7000,
      },
      'SOLD_OUT',
    );
    await createProduct(kindia, {
      name: 'Fonio',
      categoryId: cerealsId,
      quantity: 300,
      pricePerUnit: 15000,
      availableUntil: '2000-01-01',
    });
  });

  async function search(query: Record<string, string | number>) {
    const response = await api().get('/products').query(query).expect(200);
    return response.body as CatalogBody;
  }

  const names = (body: CatalogBody) => body.items.map((item) => item.name);

  it('liste sans connexion les produits en vente, les plus récents d’abord', async () => {
    const body = await search({});

    expect(names(body)).toEqual(['Tomates', 'Maïs jaune', 'Riz local']);
    expect(body).toMatchObject({ total: 3, page: 1, pageSize: 20 });
  });

  it('expose le producteur sans son téléphone ni son adresse', async () => {
    const response = await api()
      .get(`/products/${ids['Riz local']}`)
      .expect(200);

    expect(response.body).toMatchObject({
      name: 'Riz local',
      pricePerUnit: 8000,
      status: 'AVAILABLE',
      category: { id: cerealsId, name: 'Céréales' },
      producer: {
        fullName: 'Mariama Touré',
        farmType: 'CROPS',
        region: 'Kindia',
        prefecture: 'Forécariah',
      },
    });
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain('622123456');
    expect(serialized).not.toContain('Adresse privée');
    expect(response.body).not.toHaveProperty('producerId');
  });

  it('recherche dans le nom et la description, sans tenir compte des majuscules', async () => {
    expect(names(await search({ q: 'RIZ' }))).toEqual(['Riz local']);
    expect(names(await search({ q: 'étuvé' }))).toEqual(['Riz local']);
    expect(names(await search({ q: 'banane' }))).toEqual([]);
  });

  it('traite « % » et « _ » comme des caractères ordinaires', async () => {
    expect(names(await search({ q: '%' }))).toEqual(['Tomates']);
    expect(names(await search({ q: '_' }))).toEqual([]);
  });

  it('filtre par catégorie, localisation, prix, quantité et disponibilité', async () => {
    expect(names(await search({ categoryId: cerealsId }))).toEqual([
      'Maïs jaune',
      'Riz local',
    ]);
    expect(names(await search({ region: 'Kindia' }))).toEqual([
      'Tomates',
      'Riz local',
    ]);
    expect(names(await search({ prefecture: 'Coyah' }))).toEqual(['Tomates']);
    expect(
      names(await search({ region: 'Labé', prefecture: 'Coyah' })),
    ).toEqual([]);
    expect(names(await search({ minPrice: 10000 }))).toEqual([
      'Tomates',
      'Maïs jaune',
    ]);
    expect(names(await search({ maxPrice: 10000 }))).toEqual(['Riz local']);
    // La quantité s'exprime dans l'unité du produit : 3 tonnes < 600
    expect(names(await search({ minQuantity: 600 }))).toEqual(['Riz local']);
    // Le maïs n'est disponible qu'à partir de 2099
    expect(names(await search({ availableOn: '2026-12-01' }))).toEqual([
      'Tomates',
      'Riz local',
    ]);
  });

  it('trie et pagine les résultats', async () => {
    expect(names(await search({ sort: 'price_asc' }))).toEqual([
      'Riz local',
      'Tomates',
      'Maïs jaune',
    ]);
    expect(names(await search({ sort: 'price_desc' }))).toEqual([
      'Maïs jaune',
      'Tomates',
      'Riz local',
    ]);
    expect(names(await search({ sort: 'quantity_desc' }))).toEqual([
      'Riz local',
      'Tomates',
      'Maïs jaune',
    ]);

    const secondPage = await search({
      sort: 'price_asc',
      pageSize: 2,
      page: 2,
    });
    expect(secondPage).toMatchObject({ total: 3, page: 2, pageSize: 2 });
    expect(names(secondPage)).toEqual(['Maïs jaune']);
  });

  it('indique le paramètre en erreur', async () => {
    const prices = await api()
      .get('/products')
      .query({ minPrice: 10000, maxPrice: 5000 })
      .expect(400);
    expect(prices.body.errors).toEqual({
      maxPrice: 'Le prix maximum doit être supérieur au prix minimum.',
    });

    const unknown = await api()
      .get('/products')
      .query({ couleur: 'rouge' })
      .expect(400);
    expect(unknown.body.errors).toEqual({ couleur: 'Champ non autorisé.' });
  });

  it("affiche le détail d'un produit épuisé, mais pas d'un produit archivé", async () => {
    const soldOut = await api().get(`/products/${ids['Gombo']}`).expect(200);
    expect(soldOut.body.status).toBe('SOLD_OUT');

    await api().get(`/products/${ids['Oignons']}`).expect(404);
    const malformed = await api().get('/products/pas-un-uuid').expect(404);
    expect(malformed.body.message).toBe('Produit introuvable.');
  });

  it('garde les routes du producteur protégées', async () => {
    await api().get('/products/mine').expect(401);
    await api().put(`/products/${ids['Riz local']}`).send({}).expect(401);
  });
});
