import request from 'supertest';
import { createE2eApp, resetDatabase, type E2eContext } from './e2e-app';

// Commandes : création d'une commande et changement de statut (parcours critiques du §22),
// stock, acceptation d'une offre, visibilité des téléphones et contrôle des droits.

const PASSWORD = 'motdepasse123';

type Auth = { Authorization: string };

const BUYER_PHONE = '+224622111111';
const PRODUCER_PHONE = '+224623333333';

describe('Commandes (e2e)', () => {
  let ctx: E2eContext;
  let cerealsId: string;

  let buyer: Auth;
  let otherBuyer: Auth;
  let producer: Auth;
  let otherProducer: Auth;
  let riceId: string;

  beforeAll(async () => {
    ctx = await createE2eApp();
    const categories = await ctx.prisma.category.findMany();
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

  async function registerProducer(phone: string, fullName: string) {
    const auth = await register(phone, fullName, ['PRODUCER']);
    await api()
      .put('/producers/me')
      .set(auth)
      .send({ farmType: 'CROPS', region: 'Kindia', prefecture: 'Forécariah' })
      .expect(200);
    return auth;
  }

  async function createProduct(
    auth: Auth,
    body: Record<string, unknown> = {},
  ): Promise<string> {
    const response = await api()
      .post('/products')
      .set(auth)
      .send({
        name: 'Riz local',
        categoryId: cerealsId,
        quantity: 2000,
        unit: 'KG',
        pricePerUnit: 8000,
        region: 'Kindia',
        prefecture: 'Forécariah',
        ...body,
      })
      .expect(201);
    return (response.body as { id: string }).id;
  }

  const delivery = {
    deliveryRegion: 'Conakry',
    deliveryPrefecture: 'Conakry',
    deliveryCommune: 'Kaloum',
    deliveryAddress: 'Avenue de la République, près du port',
  };

  const order = (auth: Auth, body: Record<string, unknown> = {}) =>
    api()
      .post('/orders')
      .set(auth)
      .send({ productId: riceId, quantity: 500, ...delivery, ...body });

  async function placeOrder(quantity = 500, auth: Auth = buyer) {
    const response = await order(auth, { quantity }).expect(201);
    return (response.body as { id: string }).id;
  }

  const setStatus = (
    auth: Auth,
    orderId: string,
    status: string,
    note?: string,
  ) =>
    api().patch(`/orders/${orderId}/status`).set(auth).send({ status, note });

  const stockOf = (productId: string) =>
    ctx.prisma.product.findUniqueOrThrow({
      where: { id: productId },
      select: { quantity: true, status: true },
    });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    buyer = await register('622111111', 'Hôtel Kaloum', ['BUYER']);
    otherBuyer = await register('622222222', 'Restaurant Le Damier', ['BUYER']);
    producer = await registerProducer('623333333', 'Kadiatou Bangoura');
    otherProducer = await registerProducer('624444444', 'Thierno Bah');
    riceId = await createProduct(producer);
  });

  it('commande un produit et suit la commande jusqu’à la réception', async () => {
    const created = await order(buyer, {
      deliveryDate: '2099-11-20',
      note: 'Livrer avant midi.',
    }).expect(201);

    expect(created.body).toMatchObject({
      status: 'PENDING',
      totalAmount: 4_000_000,
      deliveryAddress: 'Avenue de la République, près du port',
      deliveryDate: '2099-11-20T00:00:00.000Z',
      note: 'Livrer avant midi.',
      offerId: null,
      // Téléphones cachés tant que le producteur n'a pas accepté
      buyer: { fullName: 'Hôtel Kaloum', phone: null },
      producer: { fullName: 'Kadiatou Bangoura', phone: null },
      items: [
        {
          productId: riceId,
          productName: 'Riz local',
          unit: 'KG',
          unitPrice: 8000,
          quantity: 500,
          lineTotal: 4_000_000,
        },
      ],
      events: [{ status: 'PENDING', by: 'BUYER' }],
    });
    expect(created.body).not.toHaveProperty('buyerId');
    const orderId = created.body.id as string;
    // Le stock n'est réservé qu'à l'acceptation
    expect(await stockOf(riceId)).toEqual({
      quantity: 2000,
      status: 'AVAILABLE',
    });

    const accepted = await setStatus(producer, orderId, 'ACCEPTED').expect(200);
    expect(accepted.body).toMatchObject({
      status: 'ACCEPTED',
      buyer: { phone: BUYER_PHONE },
      producer: { phone: PRODUCER_PHONE },
    });
    expect(await stockOf(riceId)).toEqual({
      quantity: 1500,
      status: 'AVAILABLE',
    });

    await setStatus(producer, orderId, 'PREPARING').expect(200);
    await setStatus(producer, orderId, 'SHIPPED').expect(200);
    await setStatus(producer, orderId, 'DELIVERED').expect(200);
    const completed = await setStatus(buyer, orderId, 'COMPLETED').expect(200);

    expect(
      completed.body.events.map((e: { status: string; by: string }) => [
        e.status,
        e.by,
      ]),
    ).toEqual([
      ['PENDING', 'BUYER'],
      ['ACCEPTED', 'PRODUCER'],
      ['PREPARING', 'PRODUCER'],
      ['SHIPPED', 'PRODUCER'],
      ['DELIVERED', 'PRODUCER'],
      ['COMPLETED', 'BUYER'],
    ]);

    // Historique des deux côtés
    const purchases = await api()
      .get('/orders/purchases')
      .set(buyer)
      .expect(200);
    expect(purchases.body).toMatchObject({
      total: 1,
      items: [{ id: orderId, status: 'COMPLETED' }],
    });
    expect(purchases.body.items[0]).not.toHaveProperty('events');
    const sales = await api()
      .get('/orders/sales')
      .query({ status: 'COMPLETED' })
      .set(producer)
      .expect(200);
    expect(sales.body.items.map((o: { id: string }) => o.id)).toEqual([
      orderId,
    ]);
    await api()
      .get('/orders/sales')
      .query({ status: 'PENDING' })
      .set(producer)
      .expect(200, /"total":0/);
  });

  it('refuse une commande au-delà du stock, puis épuise et rend le stock', async () => {
    const tooMuch = await order(buyer, { quantity: 2001 }).expect(400);
    expect(tooMuch.body.errors).toEqual({
      quantity: 'Quantité disponible : 2 000.',
    });

    // Deux commandes de 1 500 kg : chacune passe, mais une seule peut être acceptée
    const first = await placeOrder(1500);
    const second = await placeOrder(1500, otherBuyer);
    await setStatus(producer, first, 'ACCEPTED').expect(200);
    await setStatus(producer, second, 'ACCEPTED').expect(
      409,
      /Stock insuffisant/,
    );
    expect(await stockOf(riceId)).toEqual({
      quantity: 500,
      status: 'AVAILABLE',
    });
    await setStatus(producer, second, 'REJECTED').expect(200);

    // Les 500 kg restants : le produit devient épuisé et quitte le catalogue
    const last = await placeOrder(500, otherBuyer);
    await setStatus(producer, last, 'ACCEPTED').expect(200);
    expect(await stockOf(riceId)).toEqual({ quantity: 0, status: 'SOLD_OUT' });
    await api()
      .get('/products')
      .expect(200, /"total":0/);
    await order(buyer, { quantity: 1 }).expect(409, /plus disponible/);

    // Annulée : le stock revient et le produit est de nouveau en vente
    await setStatus(otherBuyer, last, 'CANCELLED').expect(200);
    expect(await stockOf(riceId)).toEqual({
      quantity: 500,
      status: 'AVAILABLE',
    });
    // L'annulation d'une commande jamais acceptée ne touche pas au stock
    const pending = await placeOrder(100);
    await setStatus(buyer, pending, 'CANCELLED').expect(200);
    expect(await stockOf(riceId)).toEqual({
      quantity: 500,
      status: 'AVAILABLE',
    });
  });

  it('accepte une offre : commande créée, demande satisfaite, autres offres refusées', async () => {
    const published = await api()
      .post('/requests')
      .set(buyer)
      .send({
        categoryId: cerealsId,
        productName: 'Riz',
        quantity: 100,
        unit: 'BAG',
        region: 'Conakry',
        prefecture: 'Conakry',
      })
      .expect(201);
    const requestId = published.body.id as string;

    const chosen = await api()
      .post(`/requests/${requestId}/offers`)
      .set(producer)
      .send({ quantity: 80, pricePerUnit: 400_000, productId: riceId })
      .expect(201);
    const other = await api()
      .post(`/requests/${requestId}/offers`)
      .set(otherProducer)
      .send({ quantity: 100, pricePerUnit: 420_000 })
      .expect(201);

    const accepted = await api()
      .post(`/offers/${chosen.body.id}/accept`)
      .set(buyer)
      .send(delivery)
      .expect(201);
    expect(accepted.body).toMatchObject({
      status: 'ACCEPTED',
      offerId: chosen.body.id,
      totalAmount: 32_000_000,
      // Le producteur s'est engagé en faisant son offre : les téléphones sont visibles
      buyer: { phone: BUYER_PHONE },
      producer: { fullName: 'Kadiatou Bangoura', phone: PRODUCER_PHONE },
      // Unité de la demande (sacs), pas celle du produit (kg)
      items: [
        {
          productId: riceId,
          productName: 'Riz local',
          unit: 'BAG',
          unitPrice: 400_000,
          quantity: 80,
        },
      ],
      events: [{ status: 'ACCEPTED', by: 'BUYER', note: 'Offre acceptée.' }],
    });

    const detail = await api()
      .get(`/requests/${requestId}`)
      .set(buyer)
      .expect(200);
    expect(detail.body.status).toBe('FULFILLED');
    expect(
      detail.body.offers.map((o: { id: string; status: string }) => [
        o.id,
        o.status,
      ]),
    ).toEqual([
      [chosen.body.id, 'ACCEPTED'],
      [other.body.id, 'REJECTED'],
    ]);

    // Une seule offre acceptée par demande, et le stock du produit n'est pas touché
    await api()
      .post(`/offers/${other.body.id}/accept`)
      .set(buyer)
      .send(delivery)
      .expect(409, /plus en attente/);
    await api()
      .post(`/offers/${chosen.body.id}/accept`)
      .set(buyer)
      .send(delivery)
      .expect(409);
    expect(await stockOf(riceId)).toEqual({
      quantity: 2000,
      status: 'AVAILABLE',
    });
    expect(await ctx.prisma.order.count()).toBe(1);

    // Le producteur retrouve la commande dans ses ventes et la fait avancer
    const sales = await api().get('/orders/sales').set(producer).expect(200);
    expect(sales.body.items[0].id).toBe(accepted.body.id);
    await setStatus(producer, accepted.body.id, 'PREPARING').expect(200);
  });

  it("n'accepte une offre que pour l'acheteur de la demande", async () => {
    const published = await api()
      .post('/requests')
      .set(buyer)
      .send({
        categoryId: cerealsId,
        productName: 'Riz',
        quantity: 100,
        unit: 'KG',
        region: 'Conakry',
        prefecture: 'Conakry',
      })
      .expect(201);
    const sent = await api()
      .post(`/requests/${published.body.id}/offers`)
      .set(producer)
      .send({ quantity: 100, pricePerUnit: 8000 })
      .expect(201);
    const offerId = sent.body.id as string;

    await api()
      .post(`/offers/${offerId}/accept`)
      .set(otherBuyer)
      .send(delivery)
      .expect(404);
    await api()
      .post(`/offers/${offerId}/accept`)
      .set(producer)
      .send(delivery)
      .expect(403);
    await api()
      .post(`/offers/${offerId}/accept`)
      .set(buyer)
      .send({ ...delivery, deliveryAddress: undefined })
      .expect(400, /L'adresse de livraison est obligatoire/);

    // Une offre retirée n'est plus visible par l'acheteur
    await api()
      .patch(`/offers/${offerId}/status`)
      .set(producer)
      .send({ status: 'WITHDRAWN' })
      .expect(200);
    await api()
      .post(`/offers/${offerId}/accept`)
      .set(buyer)
      .send(delivery)
      .expect(404);
  });

  it('réserve chaque changement de statut à la bonne partie', async () => {
    const orderId = await placeOrder();

    await setStatus(buyer, orderId, 'ACCEPTED').expect(
      403,
      /revient au producteur/,
    );
    await setStatus(producer, orderId, 'SHIPPED').expect(
      409,
      /en attente ne peut pas passer au statut « expédiée »/,
    );
    await setStatus(producer, orderId, 'PENDING').expect(
      400,
      /Statut invalide/,
    );
    await setStatus(otherProducer, orderId, 'ACCEPTED').expect(404);

    await setStatus(producer, orderId, 'ACCEPTED').expect(200);
    await setStatus(producer, orderId, 'PREPARING').expect(200);
    // En préparation : l'acheteur ne peut plus annuler, le producteur doit donner un motif
    await setStatus(buyer, orderId, 'CANCELLED').expect(
      403,
      /revient au producteur/,
    );
    const noReason = await setStatus(producer, orderId, 'CANCELLED').expect(
      400,
    );
    expect(noReason.body.errors).toEqual({
      note: "Indiquez à l'acheteur le motif de l'annulation.",
    });
    const cancelled = await setStatus(
      producer,
      orderId,
      'CANCELLED',
      'Récolte abîmée par la pluie.',
    ).expect(200);
    expect(cancelled.body).toMatchObject({
      status: 'CANCELLED',
      // Commande annulée : les téléphones sont de nouveau cachés
      buyer: { phone: null },
      producer: { phone: null },
    });
    expect(cancelled.body.events.at(-1)).toMatchObject({
      status: 'CANCELLED',
      by: 'PRODUCER',
      note: 'Récolte abîmée par la pluie.',
    });
    expect(await stockOf(riceId)).toEqual({
      quantity: 2000,
      status: 'AVAILABLE',
    });

    await setStatus(producer, orderId, 'ACCEPTED').expect(409);
  });

  it('ne montre une commande qu’à ses deux parties', async () => {
    const orderId = await placeOrder();

    await api().get(`/orders/${orderId}`).set(buyer).expect(200);
    await api().get(`/orders/${orderId}`).set(producer).expect(200);
    await api().get(`/orders/${orderId}`).set(otherBuyer).expect(404);
    await api().get(`/orders/${orderId}`).set(otherProducer).expect(404);
    await api().get(`/orders/${orderId}`).expect(401);
    await api().get('/orders/pas-un-uuid').set(buyer).expect(404);

    await api()
      .get('/orders/purchases')
      .set(otherBuyer)
      .expect(200, /"total":0/);
    await api().get('/orders/sales').set(buyer).expect(403);
  });

  it('refuse les commandes impossibles', async () => {
    // Son propre produit
    const both = await register('625555555', 'Mamadou Sow', [
      'PRODUCER',
      'BUYER',
    ]);
    await api()
      .put('/producers/me')
      .set(both)
      .send({ farmType: 'CROPS', region: 'Kindia', prefecture: 'Coyah' })
      .expect(200);
    const ownProduct = await createProduct(both);
    await order(both, { productId: ownProduct }).expect(
      403,
      /votre propre produit/,
    );

    // Compte sans le rôle acheteur, produit inconnu ou archivé, date passée
    await order(producer).expect(403);
    await order(buyer, {
      productId: '00000000-0000-4000-8000-000000000000',
    }).expect(400, /Produit introuvable/);
    await api()
      .patch(`/products/${riceId}/status`)
      .set(producer)
      .send({ status: 'ARCHIVED' })
      .expect(200);
    await order(buyer).expect(400, /Produit introuvable/);
    await api()
      .patch(`/products/${riceId}/status`)
      .set(producer)
      .send({ status: 'AVAILABLE' })
      .expect(200);
    const pastDate = await order(buyer, { deliveryDate: '2000-01-01' }).expect(
      400,
    );
    expect(pastDate.body.errors).toEqual({
      deliveryDate: 'La date de livraison ne peut pas être déjà passée.',
    });

    // Montant qui dépasserait la précision des nombres JavaScript
    const huge = await createProduct(otherProducer, {
      quantity: 10_000_000,
      pricePerUnit: 1_000_000_000,
    });
    const tooExpensive = await order(buyer, {
      productId: huge,
      quantity: 10_000_000,
    }).expect(400);
    expect(tooExpensive.body.errors).toEqual({
      quantity: 'Le montant total de la commande est trop élevé.',
    });

    expect(await ctx.prisma.order.count()).toBe(0);
  });
});
