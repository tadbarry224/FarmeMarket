import request from 'supertest';
import { createE2eApp, resetDatabase, type E2eContext } from './e2e-app';

// Parcours critiques de l'authentification (cahier des charges §22),
// testés à travers la vraie API et une vraie base PostgreSQL (farmmarket_test).

const PASSWORD = 'motdepasse123';
const NEW_PASSWORD = 'nouveaumotdepasse456';

const registration = {
  fullName: 'Aïssatou Bah',
  phone: '622 12 34 56',
  email: 'Aissatou@Exemple.com',
  password: PASSWORD,
  roles: ['PRODUCER', 'BUYER'],
};

describe('Authentification (e2e)', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    ctx.mails.sent.length = 0;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const api = () => request(ctx.app.getHttpServer());

  async function register(body: object = registration): Promise<string> {
    const response = await api().post('/auth/register').send(body).expect(201);
    return (response.body as { accessToken: string }).accessToken;
  }

  const login = (identifier: string, password: string) =>
    api().post('/auth/login').send({ identifier, password });

  describe('inscription et connexion', () => {
    it('inscrit, connecte puis affiche le profil', async () => {
      const response = await api()
        .post('/auth/register')
        .send(registration)
        .expect(201);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        user: {
          fullName: 'Aïssatou Bah',
          phone: '+224622123456',
          email: 'aissatou@exemple.com',
          emailVerifiedAt: null,
          roles: ['PRODUCER', 'BUYER'],
        },
      });
      expect(response.body.user).not.toHaveProperty('passwordHash');

      const byPhone = await login('+224 622-12-34-56', PASSWORD).expect(200);
      await login('AISSATOU@exemple.com', PASSWORD).expect(200);

      const token = (byPhone.body as { accessToken: string }).accessToken;
      const profile = await api()
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(profile.body).toMatchObject({ phone: '+224622123456' });
    });

    it('stocke le mot de passe haché avec argon2, jamais en clair', async () => {
      await register();

      const user = await ctx.prisma.user.findUniqueOrThrow({
        where: { phone: '+224622123456' },
      });
      expect(user.passwordHash).toMatch(/^\$argon2id\$/);
      expect(user.passwordHash).not.toContain(PASSWORD);
    });

    it('renvoie un message par champ invalide', async () => {
      const response = await api()
        .post('/auth/register')
        .send({ phone: '123', roles: ['ADMIN'], isAdmin: true })
        .expect(400);

      expect(response.body).toEqual({
        statusCode: 400,
        message: 'Certains champs sont invalides.',
        errors: {
          fullName: 'Le nom complet est obligatoire.',
          phone: 'Numéro de téléphone guinéen invalide (ex. 622 12 34 56).',
          password: 'Le mot de passe est obligatoire.',
          roles:
            'Rôle invalide : seuls « producteur » et « acheteur » sont possibles.',
          isAdmin: 'Champ non autorisé.',
        },
      });
    });

    it('refuse un numéro déjà utilisé, quel que soit son format', async () => {
      await register();

      const response = await api()
        .post('/auth/register')
        .send({ ...registration, phone: '00224622123456', email: undefined })
        .expect(409);

      expect(response.body).toMatchObject({
        errors: { phone: 'Ce numéro de téléphone est déjà utilisé.' },
      });
    });

    it('renvoie le même message que le compte existe ou non', async () => {
      await register();

      const wrongPassword = await login('622123456', 'mauvais-mdp').expect(401);
      const unknownAccount = await login('622999999', PASSWORD).expect(401);

      expect(wrongPassword.body).toEqual(unknownAccount.body);
    });
  });

  describe('protection des routes', () => {
    it('refuse le profil sans jeton', async () => {
      await api().get('/users/me').expect(401);
    });

    it('refuse un jeton falsifié', async () => {
      await api()
        .get('/users/me')
        .set('Authorization', 'Bearer abc.def.ghi')
        .expect(401);
    });
  });

  describe('changement de mot de passe', () => {
    it("remplace le mot de passe : l'ancien ne fonctionne plus", async () => {
      const token = await register();

      await api()
        .patch('/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD })
        .expect(204);

      await login('622123456', PASSWORD).expect(401);
      await login('622123456', NEW_PASSWORD).expect(200);
    });

    it('exige le mot de passe actuel correct', async () => {
      const token = await register();

      const response = await api()
        .patch('/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'mauvais-mdp', newPassword: NEW_PASSWORD })
        .expect(400);

      expect(response.body).toMatchObject({
        errors: { currentPassword: 'Mot de passe actuel incorrect.' },
      });
    });
  });

  describe("vérification de l'e-mail", () => {
    it("confirme l'adresse avec le lien reçu, utilisable une seule fois", async () => {
      await register();
      const token = ctx.mails.lastToken('/verify-email');

      await api().post('/auth/verify-email').send({ token }).expect(204);
      await api().post('/auth/verify-email').send({ token }).expect(400);

      const user = await ctx.prisma.user.findUniqueOrThrow({
        where: { phone: '+224622123456' },
      });
      expect(user.emailVerifiedAt).toBeInstanceOf(Date);
    });

    it("n'envoie aucun e-mail à un utilisateur inscrit sans adresse", async () => {
      await register({ ...registration, email: '' });

      expect(ctx.mails.sent).toHaveLength(0);
    });
  });

  describe('mot de passe oublié', () => {
    const forgotPassword = (email: string) =>
      api().post('/auth/forgot-password').send({ email }).expect(200);

    async function registerWithVerifiedEmail(): Promise<void> {
      await register();
      const token = ctx.mails.lastToken('/verify-email');
      await api().post('/auth/verify-email').send({ token }).expect(204);
    }

    it("n'envoie rien tant que l'adresse n'est pas vérifiée", async () => {
      await register();
      ctx.mails.sent.length = 0;

      await forgotPassword('aissatou@exemple.com');

      expect(ctx.mails.sent).toHaveLength(0);
    });

    it('répond de la même façon pour une adresse inconnue', async () => {
      await registerWithVerifiedEmail();

      const known = await forgotPassword('aissatou@exemple.com');
      const unknown = await forgotPassword('inconnu@exemple.com');

      expect(known.body).toEqual(unknown.body);
    });

    it('réinitialise le mot de passe avec un lien à usage unique', async () => {
      await registerWithVerifiedEmail();
      await forgotPassword('AISSATOU@exemple.com');
      const token = ctx.mails.lastToken('/reset-password');

      await api()
        .post('/auth/reset-password')
        .send({ token, newPassword: NEW_PASSWORD })
        .expect(204);
      await api()
        .post('/auth/reset-password')
        .send({ token, newPassword: 'encore-un-autre-mdp' })
        .expect(400);

      await login('aissatou@exemple.com', PASSWORD).expect(401);
      await login('aissatou@exemple.com', NEW_PASSWORD).expect(200);
    });

    it("n'accepte que le dernier lien envoyé", async () => {
      await registerWithVerifiedEmail();
      await forgotPassword('aissatou@exemple.com');
      const firstToken = ctx.mails.lastToken('/reset-password');
      await forgotPassword('aissatou@exemple.com');

      await api()
        .post('/auth/reset-password')
        .send({ token: firstToken, newPassword: NEW_PASSWORD })
        .expect(400);
    });
  });
});
