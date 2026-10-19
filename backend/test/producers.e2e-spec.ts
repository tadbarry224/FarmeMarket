import request from 'supertest';
import { createE2eApp, resetDatabase, type E2eContext } from './e2e-app';

// Profil producteur : création, modification, consultation publique et contrôle des rôles.

const PASSWORD = 'motdepasse123';

const profile = {
  farmType: 'CROPS',
  region: 'Kindia',
  prefecture: 'Forécariah',
  commune: 'Maférinyah',
  address: 'Quartier Centre, près du marché',
  description: 'Riziculture familiale.',
  mainProducts: 'Riz, arachide',
};

describe('Producteurs (e2e)', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const api = () => request(ctx.app.getHttpServer());

  async function registerAs(roles: string[], phone = '622123456') {
    const response = await api()
      .post('/auth/register')
      .send({ fullName: 'Ibrahima Camara', phone, password: PASSWORD, roles })
      .expect(201);
    return (response.body as { accessToken: string }).accessToken;
  }

  it('crée, consulte puis remplace son profil producteur', async () => {
    const token = await registerAs(['PRODUCER']);
    const auth = { Authorization: `Bearer ${token}` };

    await api().get('/producers/me').set(auth).expect(404);

    const created = await api()
      .put('/producers/me')
      .set(auth)
      .send(profile)
      .expect(200);
    expect(created.body).toMatchObject(profile);

    const own = await api().get('/producers/me').set(auth).expect(200);
    expect(own.body).toMatchObject({ id: created.body.id, ...profile });

    // PUT remplace tout le profil : les champs facultatifs absents sont effacés
    const replaced = await api()
      .put('/producers/me')
      .set(auth)
      .send({ farmType: 'MIXED', region: 'Mamou', prefecture: 'Pita' })
      .expect(200);
    expect(replaced.body).toMatchObject({
      id: created.body.id,
      farmType: 'MIXED',
      region: 'Mamou',
      prefecture: 'Pita',
      commune: null,
      address: null,
      description: null,
      mainProducts: null,
    });
    expect(await ctx.prisma.producer.count()).toBe(1);
  });

  it('expose un profil public sans téléphone ni adresse', async () => {
    const token = await registerAs(['PRODUCER']);
    const created = await api()
      .put('/producers/me')
      .set('Authorization', `Bearer ${token}`)
      .send(profile)
      .expect(200);

    // Sans jeton : le profil est public
    const response = await api()
      .get(`/producers/${created.body.id}`)
      .expect(200);

    expect(response.body).toEqual({
      id: created.body.id,
      fullName: 'Ibrahima Camara',
      farmType: 'CROPS',
      description: 'Riziculture familiale.',
      region: 'Kindia',
      prefecture: 'Forécariah',
      commune: 'Maférinyah',
      mainProducts: 'Riz, arachide',
      createdAt: expect.any(String),
    });
  });

  it('renvoie 404 pour un producteur inexistant ou un identifiant mal formé', async () => {
    await api()
      .get('/producers/00000000-0000-4000-8000-000000000000')
      .expect(404);
    const malformed = await api().get('/producers/pas-un-uuid').expect(404);
    expect(malformed.body.message).toBe('Producteur introuvable.');
  });

  it('refuse le profil producteur à un compte sans le rôle producteur', async () => {
    const token = await registerAs(['BUYER']);

    await api()
      .put('/producers/me')
      .set('Authorization', `Bearer ${token}`)
      .send(profile)
      .expect(403);
    await api().put('/producers/me').send(profile).expect(401);
  });

  it('indique le champ en erreur', async () => {
    const token = await registerAs(['PRODUCER']);

    const response = await api()
      .put('/producers/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...profile, prefecture: 'Pita' })
      .expect(400);

    expect(response.body.errors).toEqual({
      prefecture: 'Cette préfecture ne fait pas partie de la région choisie.',
    });
  });

  it('liste les régions et préfectures sans connexion', async () => {
    const response = await api().get('/locations').expect(200);

    expect(response.body).toHaveLength(8);
    expect(response.body).toContainEqual({
      name: 'Mamou',
      prefectures: ['Dalaba', 'Mamou', 'Pita'],
    });
  });
});
