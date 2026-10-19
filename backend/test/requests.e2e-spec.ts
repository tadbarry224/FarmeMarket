import request from 'supertest';
import { createE2eApp, resetDatabase, type E2eContext } from './e2e-app';

// Demandes d'achat et offres : création d'une demande et réponse à une demande
// (parcours critiques du cahier des charges §22), matching, visibilité et règles de modification.

const PASSWORD = 'motdepasse123';

type Auth = { Authorization: string };

describe("Demandes d'achat et offres (e2e)", () => {
  let ctx: E2eContext;
  let vegetablesId: string;
  let cerealsId: string;

  // Comptes recréés avant chaque test
  let buyer: Auth;
  let otherBuyer: Auth;
  let conakryProducer: Auth;
  let labeProducer: Auth;
  let tomatoesProductId: string;

  beforeAll(async () => {
    ctx = await createE2eApp();
    const categories = await ctx.prisma.category.findMany();
    vegetablesId = categories.find((c) => c.name === 'Légumes')!.id;
    cerealsId = categories.find((c) => c.name === 'Céréales')!.id;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const api = () => request(ctx.app.getHttpServer());

  async function register(
    phone: string,
    fullName: string,
    roles: string[],
  ): Promise<Auth> {
    const response = await api()
      .post('/auth/register')
      .send({ fullName, phone, password: PASSWORD, roles })
      .expect(201);
    const token = (response.body as { accessToken: string }).accessToken;
    return { Authorization: `Bearer ${token}` };
  }

  async function registerProducer(
    phone: string,
    fullName: string,
    location: { region: string; prefecture: string },
    roles = ['PRODUCER'],
  ): Promise<Auth> {
    const auth = await register(phone, fullName, roles);
    await api()
      .put('/producers/me')
      .set(auth)
      .send({ farmType: 'CROPS', ...location })
      .expect(200);
    return auth;
  }

  // « Je recherche 2 tonnes de tomates, 15 000 GNF/kg maximum, livraison à Conakry »
  const tomatoesRequest = () => ({
    categoryId: vegetablesId,
    productName: 'Tomates',
    quantity: 2000,
    unit: 'KG',
    maxPricePerUnit: 15000,
    region: 'Conakry',
    prefecture: 'Conakry',
    desiredDate: '2099-11-20',
    quality: 'Catégorie A',
  });

  async function publish(auth: Auth, body: object = tomatoesRequest()) {
    const response = await api()
      .post('/requests')
      .set(auth)
      .send(body)
      .expect(201);
    return (response.body as { id: string }).id;
  }

  // Renvoie la requête supertest (et non une promesse) pour pouvoir enchaîner .expect(...)
  function offer(auth: Auth, requestId: string, body: object = {}) {
    return api()
      .post(`/requests/${requestId}/offers`)
      .set(auth)
      .send({ quantity: 1500, pricePerUnit: 12000, ...body });
  }

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);

    buyer = await register('622111111', 'Hôtel Kaloum', ['BUYER']);
    otherBuyer = await register('622222222', 'Restaurant Le Damier', ['BUYER']);
    conakryProducer = await registerProducer('623333333', 'Kadiatou Bangoura', {
      region: 'Conakry',
      prefecture: 'Conakry',
    });
    labeProducer = await registerProducer('624444444', 'Thierno Bah', {
      region: 'Labé',
      prefecture: 'Labé',
    });

    const product = await api()
      .post('/products')
      .set(conakryProducer)
      .send({
        name: 'Tomate fraîche',
        categoryId: vegetablesId,
        quantity: 3000,
        unit: 'KG',
        pricePerUnit: 12000,
        region: 'Conakry',
        prefecture: 'Conakry',
      })
      .expect(201);
    tomatoesProductId = (product.body as { id: string }).id;
  });

  it('publie une demande, reçoit une offre puis la refuse', async () => {
    const created = await api()
      .post('/requests')
      .set(buyer)
      .send(tomatoesRequest())
      .expect(201);
    expect(created.body).toMatchObject({
      productName: 'Tomates',
      quantity: 2000,
      unit: 'KG',
      maxPricePerUnit: 15000,
      desiredDate: '2099-11-20T00:00:00.000Z',
      status: 'OPEN',
      category: { id: vegetablesId, name: 'Légumes' },
      offers: [],
    });
    expect(created.body).not.toHaveProperty('buyerId');
    const requestId = created.body.id as string;

    // Le producteur la voit, avec sa pertinence et le produit à proposer
    const list = await api().get('/requests').set(conakryProducer).expect(200);
    expect(list.body).toMatchObject({ total: 1, page: 1, pageSize: 20 });
    expect(list.body.items[0]).toMatchObject({
      id: requestId,
      buyer: { fullName: 'Hôtel Kaloum' },
      match: { score: 100, productId: tomatoesProductId },
      myOffer: null,
    });
    expect(JSON.stringify(list.body)).not.toContain('622111111');

    // Il répond
    const sent = await offer(conakryProducer, requestId, {
      productId: tomatoesProductId,
      message: 'Livraison possible sous 3 jours.',
    }).expect(201);
    expect(sent.body).toMatchObject({
      quantity: 1500,
      pricePerUnit: 12000,
      status: 'PENDING',
      product: { id: tomatoesProductId, name: 'Tomate fraîche' },
      producer: { fullName: 'Kadiatou Bangoura', region: 'Conakry' },
      request: { id: requestId, productName: 'Tomates' },
    });
    const offerId = sent.body.id as string;

    // L'acheteur voit l'offre dans sa demande et dans le compteur de « mes demandes »
    const detail = await api()
      .get(`/requests/${requestId}`)
      .set(buyer)
      .expect(200);
    expect(detail.body.offers).toHaveLength(1);
    expect(detail.body.offers[0]).toMatchObject({
      id: offerId,
      producer: { fullName: 'Kadiatou Bangoura' },
    });
    const mine = await api().get('/requests/mine').set(buyer).expect(200);
    expect(mine.body).toMatchObject([{ id: requestId, offerCount: 1 }]);

    // Il la refuse : elle n'est plus en attente, le producteur ne peut plus la retirer
    await api()
      .patch(`/offers/${offerId}/status`)
      .set(buyer)
      .send({ status: 'REJECTED' })
      .expect(200, /"status":"REJECTED"/);
    await api()
      .patch(`/offers/${offerId}/status`)
      .set(conakryProducer)
      .send({ status: 'WITHDRAWN' })
      .expect(409);

    const offers = await api()
      .get('/offers/mine')
      .set(conakryProducer)
      .expect(200);
    expect(offers.body).toMatchObject([{ id: offerId, status: 'REJECTED' }]);
  });

  it('trie les demandes par pertinence pour chaque producteur', async () => {
    const tomatoes = await publish(buyer);
    const rice = await publish(otherBuyer, {
      ...tomatoesRequest(),
      categoryId: cerealsId,
      productName: 'Riz local',
      region: 'Labé',
      prefecture: 'Labé',
    });

    const forConakry = await api()
      .get('/requests')
      .set(conakryProducer)
      .expect(200);
    expect(
      forConakry.body.items.map(
        (r: { id: string; match: { score: number } }) => [r.id, r.match.score],
      ),
    ).toEqual([
      [tomatoes, 100],
      [rice, 0],
    ]);

    // Tri par date : la plus récente d'abord, quelle que soit la pertinence
    const recent = await api()
      .get('/requests')
      .query({ sort: 'recent' })
      .set(conakryProducer)
      .expect(200);
    expect(recent.body.items.map((r: { id: string }) => r.id)).toEqual([
      rice,
      tomatoes,
    ]);

    const filtered = await api()
      .get('/requests')
      .query({ region: 'Labé' })
      .set(conakryProducer)
      .expect(200);
    expect(filtered.body.items.map((r: { id: string }) => r.id)).toEqual([
      rice,
    ]);
  });

  it('refuse une date passée, une catégorie inconnue et une quantité trop grande', async () => {
    const pastDate = await api()
      .post('/requests')
      .set(buyer)
      .send({ ...tomatoesRequest(), desiredDate: '2000-01-01' })
      .expect(400);
    expect(pastDate.body.errors).toEqual({
      desiredDate: 'La date souhaitée ne peut pas être déjà passée.',
    });

    await api()
      .post('/requests')
      .set(buyer)
      .send({
        ...tomatoesRequest(),
        categoryId: '00000000-0000-4000-8000-000000000000',
      })
      .expect(400, /Catégorie inconnue/);

    const requestId = await publish(buyer);
    const tooMuch = await offer(conakryProducer, requestId, {
      quantity: 2001,
    }).expect(400);
    expect(tooMuch.body.errors).toEqual({
      quantity: "L'offre ne peut pas dépasser la quantité demandée (2 000).",
    });

    // Le produit proposé doit appartenir au producteur
    await offer(labeProducer, requestId, {
      productId: tomatoesProductId,
    }).expect(400, /Produit inconnu/);
  });

  it('ne montre une demande qu’à son auteur et aux producteurs', async () => {
    const requestId = await publish(buyer);

    await api().get(`/requests/${requestId}`).set(otherBuyer).expect(404);
    await api().get(`/requests/${requestId}`).expect(401);
    await api().get('/requests').set(buyer).expect(403);
    await api()
      .get(`/requests/${requestId}`)
      .set(labeProducer)
      .expect(200, /"myOffer":null/);
  });

  it("ne montre pas à un producteur l'offre d'un concurrent", async () => {
    const requestId = await publish(buyer);
    await offer(conakryProducer, requestId).expect(201);
    await offer(labeProducer, requestId, { pricePerUnit: 11000 }).expect(201);

    const seenByLabe = await api()
      .get(`/requests/${requestId}`)
      .set(labeProducer)
      .expect(200);
    expect(seenByLabe.body.myOffer).toMatchObject({ pricePerUnit: 11000 });
    expect(seenByLabe.body).not.toHaveProperty('offers');
    expect(JSON.stringify(seenByLabe.body)).not.toContain('12000');

    const seenByBuyer = await api()
      .get(`/requests/${requestId}`)
      .set(buyer)
      .expect(200);
    expect(seenByBuyer.body.offers).toHaveLength(2);
  });

  it('modifie une demande sans offre, puis la bloque dès la première offre', async () => {
    const requestId = await publish(buyer);

    const replaced = await api()
      .put(`/requests/${requestId}`)
      .set(buyer)
      .send({ ...tomatoesRequest(), quantity: 1000, quality: undefined })
      .expect(200);
    expect(replaced.body).toMatchObject({ quantity: 1000, quality: null });

    await offer(conakryProducer, requestId, { quantity: 800 }).expect(201);
    const blocked = await api()
      .put(`/requests/${requestId}`)
      .set(buyer)
      .send(tomatoesRequest())
      .expect(409);
    expect(blocked.body.message).toBe(
      'Cette demande a déjà reçu des offres : fermez-la et publiez-en une nouvelle.',
    );

    // La demande d'un autre acheteur est introuvable
    await api()
      .put(`/requests/${requestId}`)
      .set(otherBuyer)
      .send(tomatoesRequest())
      .expect(404);
  });

  it("ferme une demande : elle n'accepte plus d'offres et disparaît de la liste", async () => {
    const requestId = await publish(buyer);
    await offer(conakryProducer, requestId).expect(201);

    await api()
      .patch(`/requests/${requestId}/status`)
      .set(buyer)
      .send({ status: 'CLOSED' })
      .expect(200, /"status":"CLOSED"/);
    await api()
      .patch(`/requests/${requestId}/status`)
      .set(buyer)
      .send({ status: 'CLOSED' })
      .expect(409);
    await api()
      .patch(`/requests/${requestId}/status`)
      .set(buyer)
      .send({ status: 'FULFILLED' })
      .expect(400);

    await api()
      .get('/requests')
      .set(labeProducer)
      .expect(200, /"total":0/);
    await offer(labeProducer, requestId).expect(409, /n'accepte plus d'offres/);
    // Un producteur sans offre ne la voit plus ; celui qui a répondu peut suivre son offre
    await api().get(`/requests/${requestId}`).set(labeProducer).expect(404);
    await api()
      .get(`/requests/${requestId}`)
      .set(conakryProducer)
      .expect(200, /"status":"CLOSED"/);
  });

  it('accepte une seule offre par producteur, renouvelable après retrait', async () => {
    const requestId = await publish(buyer);
    const first = await offer(conakryProducer, requestId).expect(201);
    const offerId = first.body.id as string;

    await offer(conakryProducer, requestId).expect(
      409,
      /déjà fait une offre pour cette demande/,
    );

    const updated = await api()
      .put(`/offers/${offerId}`)
      .set(conakryProducer)
      .send({ quantity: 2000, pricePerUnit: 11500 })
      .expect(200);
    expect(updated.body).toMatchObject({ quantity: 2000, pricePerUnit: 11500 });

    await api()
      .patch(`/offers/${offerId}/status`)
      .set(conakryProducer)
      .send({ status: 'WITHDRAWN' })
      .expect(200);
    // Retirée : l'acheteur ne la voit plus
    const detail = await api()
      .get(`/requests/${requestId}`)
      .set(buyer)
      .expect(200);
    expect(detail.body.offers).toEqual([]);
    await api()
      .patch(`/offers/${offerId}/status`)
      .set(buyer)
      .send({ status: 'REJECTED' })
      .expect(404);

    const renewed = await offer(conakryProducer, requestId, {
      pricePerUnit: 10000,
    }).expect(201);
    expect(renewed.body).toMatchObject({
      id: offerId,
      status: 'PENDING',
      pricePerUnit: 10000,
    });
  });

  it('contrôle qui peut répondre, retirer ou refuser', async () => {
    const requestId = await publish(buyer);

    // Compte à la fois acheteur et producteur : pas de réponse à sa propre demande
    const both = await registerProducer(
      '625555555',
      'Mamadou Sow',
      { region: 'Conakry', prefecture: 'Conakry' },
      ['PRODUCER', 'BUYER'],
    );
    const ownRequest = await publish(both);
    await offer(both, ownRequest).expect(403, /votre propre demande/);
    const listed = await api().get('/requests').set(both).expect(200);
    expect(listed.body.items.map((r: { id: string }) => r.id)).toEqual([
      requestId,
    ]);

    // Producteur sans profil, acheteur, visiteur
    const noProfile = await register('626666666', 'Sans Profil', ['PRODUCER']);
    await offer(noProfile, requestId).expect(
      403,
      /Complétez votre profil producteur avant de répondre à une demande/,
    );
    await offer(otherBuyer, requestId).expect(403);
    await offer({ Authorization: '' }, requestId).expect(401);

    const sent = await offer(conakryProducer, requestId).expect(201);
    const offerId = sent.body.id as string;

    await api()
      .patch(`/offers/${offerId}/status`)
      .set(conakryProducer)
      .send({ status: 'REJECTED' })
      .expect(403, /Seul l'acheteur peut refuser/);
    await api()
      .patch(`/offers/${offerId}/status`)
      .set(buyer)
      .send({ status: 'WITHDRAWN' })
      .expect(403, /Seul le producteur peut retirer/);
    await api()
      .patch(`/offers/${offerId}/status`)
      .set(otherBuyer)
      .send({ status: 'REJECTED' })
      .expect(404);
    await api()
      .put(`/offers/${offerId}`)
      .set(labeProducer)
      .send({ quantity: 1, pricePerUnit: 1 })
      .expect(404);
  });
});
