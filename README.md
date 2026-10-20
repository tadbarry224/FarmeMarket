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
| Tests | Jest, Supertest (backend), Testing Library (frontend) |

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

Quatre fichiers de configuration sont nécessaires. **Ils contiennent des secrets et ne doivent jamais être commités** (ils sont ignorés par Git).

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

### 4. `frontend/.env.local` — configuration du frontend

```bash
cp frontend/.env.example frontend/.env.local
```

| Variable | Description |
|---|---|
| `API_URL` | Adresse de l'API (`http://localhost:3001`). Lue uniquement par le serveur Next.js : le navigateur ne parle jamais directement à l'API. |

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

> Le port 3000 doit être libre. Si un autre projet l'utilise déjà, lancer `npm run dev -- -p 3002` et mettre à jour `FRONTEND_URL` dans `backend/.env` (liens des e-mails).

La connexion est conservée dans un cookie `httpOnly` : le jeton n'est jamais accessible au JavaScript du navigateur. Toutes les données passent par le serveur Next.js, qui appelle l'API.

## Tests

```bash
cd backend
npm test           # tests unitaires (sans base de données)
npm run test:e2e   # tests e2e : parcours complets sur la base farmmarket_test (Docker doit tourner)
npm run lint       # analyse du code
npm run build      # vérification de la compilation TypeScript

cd ../frontend
npm test           # tests des composants et des fonctions
npm run lint       # analyse du code
npm run typecheck  # vérification des types
npm run build      # compilation de production
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
| `GET` | `/producers/me` | producteur | Consulter son profil producteur (adresse comprise) |
| `PUT` | `/producers/me` | producteur | Créer ou remplacer son profil producteur |
| `GET` | `/producers/:id` | public | Profil public d'un producteur (sans téléphone ni adresse) |
| `GET` | `/locations` | public | Régions et préfectures de Guinée |
| `GET` | `/categories` | public | Catégories de produits |
| `GET` | `/products` | public | Catalogue : recherche, filtres, tri et pagination (voir ci-dessous) |
| `GET` | `/products/:id` | public | Détail d'un produit (un produit archivé n'est plus visible) |
| `POST` | `/products` | producteur | Publier un produit (profil producteur requis) |
| `GET` | `/products/mine` | producteur | Lister ses produits, archivés compris |
| `PUT` | `/products/:id` | producteur | Modifier un de ses produits (remplacement complet) |
| `PATCH` | `/products/:id/status` | producteur | Passer un produit en disponible, épuisé ou archivé |
| `POST` | `/requests` | acheteur | Publier une demande d'achat |
| `GET` | `/requests/mine` | acheteur | Ses demandes, avec le nombre d'offres reçues |
| `GET` | `/requests` | producteur | Demandes ouvertes, triées par pertinence (voir ci-dessous) |
| `GET` | `/requests/:id` | auteur ou producteur | Détail : avec les offres reçues pour l'auteur, avec sa propre offre pour un producteur |
| `PUT` | `/requests/:id` | acheteur | Modifier sa demande, tant qu'elle n'a reçu aucune offre |
| `PATCH` | `/requests/:id/status` | acheteur | Fermer sa demande (`{ "status": "CLOSED" }`) |
| `POST` | `/requests/:id/offers` | producteur | Faire une offre (une seule par demande, renouvelable après retrait) |
| `GET` | `/offers/mine` | producteur | Ses offres et leur statut |
| `PUT` | `/offers/:id` | producteur | Modifier son offre tant qu'elle est en attente |
| `PATCH` | `/offers/:id/status` | producteur ou acheteur | Retirer son offre (`WITHDRAWN`) ou refuser une offre reçue (`REJECTED`) |
| `POST` | `/offers/:id/accept` | acheteur | Accepter une offre : crée la commande, satisfait la demande, refuse les autres offres |
| `POST` | `/orders` | acheteur | Commander un produit du catalogue (en attente de l'accord du producteur) |
| `GET` | `/orders/purchases` | acheteur | Historique de ses achats (`?status=`, pagination) |
| `GET` | `/orders/sales` | producteur | Historique de ses ventes (`?status=`, pagination) |
| `GET` | `/orders/:id` | acheteur ou producteur de la commande | Détail et historique des statuts |
| `PATCH` | `/orders/:id/status` | acheteur ou producteur de la commande | Faire avancer, refuser ou annuler une commande |

Cycle de vie d'une commande :

```
PENDING → ACCEPTED → PREPARING → SHIPPED → DELIVERED → COMPLETED
   ↓          ↓           ↓
REJECTED   CANCELLED   CANCELLED
```

- le producteur accepte ou refuse, puis fait avancer la commande jusqu'à `DELIVERED` ; l'acheteur confirme la réception (`COMPLETED`) ;
- l'acheteur peut annuler tant que la préparation n'a pas commencé ; le producteur jusqu'à l'expédition, avec un motif obligatoire ;
- une commande du catalogue retire sa quantité du stock à l'acceptation et l'y remet si elle est annulée ; une commande issue d'une offre ne touche pas au stock ;
- les deux parties voient le téléphone de l'autre une fois la commande acceptée, et seulement tant qu'elle n'est ni refusée ni annulée.

Règles complètes : [`src/orders/order-transitions.ts`](backend/src/orders/order-transitions.ts).

Le catalogue (`GET /products`) n'affiche que les produits **disponibles** dont la période de disponibilité n'est pas terminée. Paramètres, tous facultatifs :

| Paramètre | Exemple | Effet |
|---|---|---|
| `q` | `riz` | Recherche dans le nom et la description (majuscules ignorées) |
| `categoryId` | `7b0e…` | Une catégorie (identifiant renvoyé par `/categories`) |
| `region`, `prefecture` | `Kindia`, `Coyah` | Localisation du produit (noms renvoyés par `/locations`) |
| `minPrice`, `maxPrice` | `5000` | Prix par unité, en GNF |
| `minQuantity` | `500` | Quantité disponible minimale, dans l'unité du produit |
| `availableOn` | `2026-12-01` | Produits disponibles à cette date |
| `sort` | `price_asc` | `recent` (par défaut), `price_asc`, `price_desc` ou `quantity_desc` |
| `page`, `pageSize` | `2`, `20` | Pagination (20 par page par défaut, 50 au maximum) |

Réponse : `{ "items": [...], "total": 42, "page": 2, "pageSize": 20 }`.

Les demandes d'achat ne sont visibles que par leur auteur et par les producteurs, jamais par le public. Le téléphone de l'acheteur n'est pas communiqué, et un producteur ne voit pas les offres de ses concurrents. La liste des demandes (`GET /requests`) n'affiche que les demandes ouvertes dont la date souhaitée n'est pas passée. Elle accepte les paramètres `categoryId`, `region` (lieu de livraison), `sort` (`relevance` par défaut, ou `recent`), `page` et `pageSize`.

Chaque demande y reçoit un **score de pertinence** sur 100 (`match.score`), calculé à partir des produits disponibles du producteur. C'est le score de son meilleur produit (`match.productId`) :

| Critère | Points |
|---|---|
| Même catégorie (sans elle, le score est 0) | 30 |
| Le nom du produit correspond (sans tenir compte des accents ni du pluriel) | 20 |
| Quantité suffisante, dans la même unité | 15 |
| Prix dans le budget (ou budget non précisé) | 15 |
| Produit dans la préfecture de livraison (10) ou au moins dans la même région (5) | 10 |
| Disponible à la date souhaitée (ou date non précisée) | 10 |

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
│   │   ├── producers/          # Profil producteur
│   │   ├── locations/          # Régions et préfectures de Guinée
│   │   ├── categories/         # Catégories de produits
│   │   ├── products/           # Annonces des producteurs et catalogue public
│   │   ├── requests/           # Demandes d'achat et matching
│   │   ├── offers/             # Offres des producteurs en réponse aux demandes
│   │   ├── orders/             # Commandes, statuts, stock et historique
│   │   ├── mail/               # Envoi des e-mails (console en développement, SMTP en production)
│   │   ├── prisma/             # Connexion à la base de données
│   │   ├── common/             # Utilitaires partagés (téléphone, validation, configuration)
│   │   ├── scripts/            # Scripts en ligne de commande (création de l'administrateur)
│   │   └── main.ts             # Point d'entrée
│   └── test/                   # Tests e2e
└── frontend/                   # Application Next.js
    └── src/
        ├── app/                # Pages (une route par dossier) et Server Actions
        ├── components/         # Composants d'interface (champs, boutons, en-tête…)
        ├── lib/                # Appels à l'API, session, utilitaires
        └── proxy.ts            # Redirige vers la connexion les pages réservées
```

Le backend est organisé **par domaine** (un module NestJS par domaine métier), conformément au cahier des charges.

## État d'avancement

| Phase | Contenu | État |
|---|---|---|
| 1. Fondations | Git, Next.js, NestJS, PostgreSQL, Docker, Prisma | ✅ Terminée |
| 2. Authentification | Comptes, rôles, JWT, vérification de l'e-mail, mot de passe oublié | ✅ Terminée |
| 3. Marketplace | Producteurs, produits, catégories, catalogue, recherche | 🚧 En cours (API terminée, photos à venir) |
| 4. Demandes | Demandes d'achat, offres des producteurs, matching par règles simples | ✅ API terminée |
| 5. Commandes | Commande depuis le catalogue ou une offre, statuts, stock, historique | ✅ API terminée |
| Frontend | Compte : inscription, connexion, profil, mot de passe, e-mails | 🚧 En cours (catalogue, espace producteur, demandes et commandes à venir) |
| 6 à 9 | Logistique, traçabilité, statistiques, intelligence | ⏳ À venir |

Le détail de chaque phase figure dans le [cahier des charges](docs/cahier-des-charges.md#26-roadmap).
