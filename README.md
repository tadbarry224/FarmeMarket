# FarmMarket

Plateforme web de mise en relation entre **producteurs agricoles** et **acheteurs** en Guinée.

Les producteurs y publient leurs produits disponibles ; les acheteurs (particuliers, restaurants, hôtels, grossistes…) recherchent des produits, publient leurs besoins, reçoivent des propositions et passent commande.

Le périmètre complet, le MVP et la feuille de route sont décrits dans le [cahier des charges](docs/cahier-des-charges.md).

## Sommaire

- [Technologies](#technologies)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Lancement](#lancement)
- [Tests](#tests)
- [API](#api)
- [Structure du projet](#structure-du-projet)
- [État d'avancement](#état-davancement)

## Technologies

| Domaine | Technologies |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | NestJS 12, TypeScript, API REST |
| Base de données | PostgreSQL 16 (Docker) |
| ORM | Prisma 7 |
| Authentification | JWT, mots de passe hachés avec argon2 |
| Tests | Jest, Supertest |

## Prérequis

- [Node.js](https://nodejs.org) 24 (LTS) et npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (pour PostgreSQL)
- Git

## Installation

```bash
git clone https://github.com/tadbarry224/FarmeMarket.git FarmMarket
cd FarmMarket

# Backend
cd backend
npm install
npx prisma generate   # génère le client Prisma (non versionné) dans src/generated/

# Frontend
cd ../frontend
npm install
```

## Configuration

Trois fichiers de configuration sont nécessaires. **Ils contiennent des secrets et ne doivent jamais être commités** (ils sont ignorés par Git).

### 1. `.env` (racine) — mot de passe PostgreSQL

Utilisé par Docker Compose pour créer la base.

```env
FARMMARKET_DB_PASSWORD=choisir-un-mot-de-passe
```

### 2. `backend/.env` — configuration du backend

Copier le modèle puis compléter :

```bash
cp backend/.env.example backend/.env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL. Le mot de passe doit être celui de `FARMMARKET_DB_PASSWORD` (port `5433`, base `farmmarket`). |
| `JWT_SECRET` | Secret de signature des jetons de connexion (32 caractères minimum). Voir ci-dessous pour le générer. |
| `JWT_EXPIRES_IN` | Durée de validité d'une connexion (`24h` par défaut). |
| `FRONTEND_URL` | Adresse du frontend, utilisée dans les liens envoyés par e-mail (`http://localhost:3000`). |
| `SMTP_*`, `MAIL_FROM` | Envoi des e-mails. **Facultatif en développement** : sans `SMTP_HOST`, les e-mails sont affichés dans la console du backend. **Obligatoire en production.** |
| `ADMIN_*` | Utilisé uniquement par `npm run seed:admin` (voir [Créer le compte administrateur](#créer-le-compte-administrateur)). |

Générer un secret JWT :

```bash
node -e "console.log(require('node:crypto').randomBytes(64).toString('base64url'))"
```

> Le serveur refuse de démarrer si une variable obligatoire est absente ou invalide.

### 3. `backend/.env.test` — configuration des tests e2e

```bash
cp backend/.env.test.example backend/.env.test
```

Même principe que `backend/.env`, mais avec la base **`farmmarket_test`** et un secret JWT **différent**. Cette base est vidée avant chaque test : les tests refusent de s'exécuter si le nom de la base ne se termine pas par `_test`.

## Lancement

### PostgreSQL

Depuis la racine du projet :

```bash
docker compose up -d
```

Le conteneur `farmmarket-postgres` écoute sur le port **5433**. Les données sont conservées dans un volume Docker.

Créer la base de test (une seule fois) :

```bash
docker exec farmmarket-postgres createdb -U farmmarket_user farmmarket_test
```

### Backend

```bash
cd backend
npx prisma migrate deploy   # crée ou met à jour les tables
npm run start:dev           # http://localhost:3001 (redémarre à chaque modification)
```

Pour explorer la base de données dans le navigateur : `npx prisma studio`.

### Créer le compte administrateur

Le rôle administrateur ne peut jamais être choisi à l'inscription. Le premier compte administrateur est créé en ligne de commande :

1. Renseigner dans `backend/.env` : `ADMIN_PHONE` (un numéro **dédié**, différent de tout compte personnel), `ADMIN_PASSWORD` (12 caractères minimum) et, facultativement, `ADMIN_FULL_NAME` et `ADMIN_EMAIL`.
2. Lancer :

   ```bash
   cd backend
   npm run seed:admin
   ```

3. **Retirer `ADMIN_PASSWORD` de `backend/.env`** une fois le compte créé.

Le script ne modifie jamais un compte existant : relancé, il indique simplement que l'administrateur existe déjà.

### Frontend

```bash
cd frontend
npm run dev   # http://localhost:3000
```

## Tests

```bash
cd backend
npm test           # tests unitaires (sans base de données)
npm run test:e2e   # tests e2e : parcours complets sur la base farmmarket_test (Docker doit tourner)
npm run lint       # analyse du code
npm run build      # vérification de la compilation TypeScript
```

## API

Le backend expose une API REST sur `http://localhost:3001`. Les routes protégées attendent l'en-tête `Authorization: Bearer <jeton>`, obtenu à l'inscription ou à la connexion.

| Méthode | Route | Accès | Description |
|---|---|---|---|
| `POST` | `/auth/register` | public | Créer un compte (téléphone obligatoire, e-mail facultatif) |
| `POST` | `/auth/login` | public | Se connecter avec le téléphone ou l'e-mail |
| `GET` | `/users/me` | connecté | Consulter son profil |
| `PATCH` | `/auth/password` | connecté | Changer son mot de passe |
| `POST` | `/auth/verify-email` | public | Confirmer son adresse e-mail (lien reçu par e-mail) |
| `POST` | `/auth/resend-verification` | connecté | Recevoir un nouveau lien de confirmation |
| `POST` | `/auth/forgot-password` | public | Demander un lien de réinitialisation (adresse vérifiée uniquement) |
| `POST` | `/auth/reset-password` | public | Choisir un nouveau mot de passe avec le lien reçu |

Les erreurs liées à un formulaire indiquent le champ concerné :

```json
{
  "statusCode": 400,
  "message": "Certains champs sont invalides.",
  "errors": { "phone": "Numéro de téléphone guinéen invalide (ex. 622 12 34 56)." }
}
```

Les numéros de téléphone sont acceptés sous toutes les formes courantes (`622 12 34 56`, `+224 622…`, `00224…`) et enregistrés au format `+224XXXXXXXXX`.

## Structure du projet

```
FarmMarket/
├── compose.yaml                # Conteneur PostgreSQL
├── docs/
│   └── cahier-des-charges.md   # Périmètre et feuille de route
├── backend/                    # API NestJS
│   ├── prisma/
│   │   ├── schema.prisma       # Modèle de données
│   │   └── migrations/         # Historique de la structure de la base
│   ├── src/
│   │   ├── auth/               # Inscription, connexion, JWT, rôles, e-mails de compte
│   │   ├── users/              # Profil utilisateur
│   │   ├── mail/               # Envoi des e-mails (console en développement, SMTP en production)
│   │   ├── prisma/             # Connexion à la base de données
│   │   ├── common/             # Utilitaires partagés (téléphone, validation, configuration)
│   │   ├── scripts/            # Scripts en ligne de commande (création de l'administrateur)
│   │   └── main.ts             # Point d'entrée
│   └── test/                   # Tests e2e
└── frontend/                   # Application Next.js
    └── src/app/
```

Le backend est organisé **par domaine** (un module NestJS par domaine métier), conformément au cahier des charges.

## État d'avancement

| Phase | Contenu | État |
|---|---|---|
| 1. Fondations | Git, Next.js, NestJS, PostgreSQL, Docker, Prisma | ✅ Terminée |
| 2. Authentification | Comptes, rôles, JWT, vérification de l'e-mail, mot de passe oublié | ✅ Terminée |
| 3. Marketplace | Producteurs, produits, catégories, catalogue, recherche | ⏳ À venir |
| 4 à 9 | Demandes, commandes, logistique, traçabilité, statistiques, intelligence | ⏳ À venir |

Le détail de chaque phase figure dans le [cahier des charges](docs/cahier-des-charges.md#26-roadmap).
