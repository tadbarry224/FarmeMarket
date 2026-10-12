# FarmMarket — Cahier des charges de développement

| | |
|---|---|
| **Version** | 1.0 |
| **Type** | Application web |
| **Nature** | Projet personnel — développement individuel |

## Table des matières

1. [Présentation du projet](#1-présentation-du-projet)
2. [Objectifs du projet](#2-objectifs-du-projet)
3. [Utilisateurs](#3-utilisateurs)
4. [Fonctionnalités principales](#4-fonctionnalités-principales)
5. [Gestion des producteurs](#5-gestion-des-producteurs)
6. [Gestion des produits](#6-gestion-des-produits)
7. [Catalogue](#7-catalogue)
8. [Demandes d'achat](#8-demandes-dachat)
9. [Système de matching](#9-système-de-matching)
10. [Commandes](#10-commandes)
11. [Livraison](#11-livraison)
12. [Traçabilité](#12-traçabilité)
13. [Système d'évaluation](#13-système-dévaluation)
14. [Notifications](#14-notifications)
15. [Tableaux de bord](#15-tableaux-de-bord)
16. [Statistiques](#16-statistiques)
17. [Architecture technique](#17-architecture-technique)
18. [Architecture du projet](#18-architecture-du-projet)
19. [Modules backend](#19-modules-backend)
20. [Principales entités](#20-principales-entités)
21. [Règles de développement](#21-règles-de-développement)
22. [Tests](#22-tests)
23. [Git](#23-git)
24. [Documentation](#24-documentation)
25. [MVP](#25-mvp)
26. [Roadmap](#26-roadmap)
27. [Fonctionnalités hors MVP](#27-fonctionnalités-hors-mvp)
28. [Principes de qualité](#28-principes-de-qualité)
29. [Critères de réussite](#29-critères-de-réussite)
30. [Vision finale](#30-vision-finale)
31. [Règle finale du projet](#31-règle-finale-du-projet)

---

## 1. Présentation du projet

FarmMarket est une plateforme web destinée à faciliter les échanges entre les producteurs agricoles et les acheteurs.

La plateforme doit permettre aux producteurs de présenter leurs produits disponibles et aux acheteurs de rechercher des produits, publier leurs besoins, recevoir des propositions et effectuer des commandes.

FarmMarket ne doit pas être conçu comme un simple site de petites annonces.

L'objectif est de construire progressivement un véritable système de gestion du marché agricole, intégrant :

- marketplace ;
- gestion de l'offre ;
- gestion de la demande ;
- mise en relation ;
- commandes ;
- livraison ;
- traçabilité ;
- réputation ;
- statistiques ;
- recommandations.

---

## 2. Objectifs du projet

Les objectifs principaux sont :

1. Permettre aux producteurs de commercialiser leurs produits.
2. Permettre aux acheteurs de trouver facilement des produits agricoles.
3. Permettre aux acheteurs de publier directement leurs besoins.
4. Mettre en relation automatiquement ou semi-automatiquement l'offre et la demande.
5. Permettre le suivi des commandes.
6. Préparer la gestion de la livraison.
7. Permettre progressivement la traçabilité des produits.
8. Fournir des statistiques sur le marché.
9. Construire une architecture suffisamment propre pour accueillir de futures fonctionnalités.

---

## 3. Utilisateurs

### 3.1 Producteur

Le producteur peut :

- créer son compte ;
- gérer son profil ;
- renseigner son exploitation ;
- publier ses produits ;
- modifier ses produits ;
- indiquer les quantités disponibles ;
- définir ses prix ;
- indiquer sa localisation ;
- consulter les demandes des acheteurs ;
- répondre aux demandes ;
- gérer ses commandes ;
- suivre ses ventes ;
- consulter ses statistiques ;
- recevoir des évaluations.

### 3.2 Acheteur

L'acheteur peut :

- créer son compte ;
- rechercher des produits ;
- filtrer les produits ;
- consulter les profils des producteurs ;
- consulter les détails d'un produit ;
- publier une demande ;
- recevoir des propositions ;
- passer une commande ;
- suivre ses commandes ;
- suivre les livraisons ;
- évaluer les producteurs.

Les acheteurs peuvent être :

- particuliers ;
- restaurants ;
- hôtels ;
- supermarchés ;
- grossistes ;
- transformateurs ;
- commerçants.

### 3.3 Transporteur

Le transporteur pourra être intégré progressivement.

Il pourra :

- créer son profil ;
- consulter les livraisons qui lui sont attribuées ;
- accepter une livraison ;
- indiquer son statut ;
- suivre son trajet ;
- confirmer la livraison.

### 3.4 Administrateur

L'administrateur peut :

- gérer les utilisateurs ;
- gérer les producteurs ;
- gérer les acheteurs ;
- gérer les produits ;
- gérer les catégories ;
- gérer les demandes ;
- gérer les commandes ;
- gérer les signalements ;
- consulter les statistiques ;
- suspendre un compte ;
- gérer les paramètres de la plateforme.

---

## 4. Fonctionnalités principales

### 4.1 Authentification

Le système doit fournir :

- inscription ;
- connexion ;
- déconnexion ;
- récupération du mot de passe ;
- modification du mot de passe ;
- gestion du profil ;
- gestion des rôles.

L'authentification doit être sécurisée.

---

## 5. Gestion des producteurs

Chaque producteur doit disposer d'un profil.

Informations possibles :

- nom ;
- téléphone ;
- adresse ;
- région ;
- préfecture ;
- commune ;
- description ;
- photo ;
- type d'exploitation ;
- produits principaux.

Le producteur peut également gérer une ou plusieurs exploitations.

---

## 6. Gestion des produits

Un producteur doit pouvoir créer une annonce.

Une annonce doit pouvoir contenir :

- nom du produit ;
- catégorie ;
- description ;
- quantité disponible ;
- unité ;
- prix ;
- localisation ;
- période de disponibilité ;
- qualité ;
- conditionnement ;
- photos ;
- statut.

Exemples :

- Riz local — 2 000 kg — 8 000 GNF/kg
- Tomates — 500 kg — 12 000 GNF/kg
- Maïs — 3 tonnes — disponible à partir du 15 novembre.

---

## 7. Catalogue

Le catalogue est l'une des fonctionnalités centrales.

L'utilisateur doit pouvoir :

- consulter les produits ;
- rechercher un produit ;
- filtrer par catégorie ;
- filtrer par localisation ;
- filtrer par prix ;
- filtrer par quantité ;
- filtrer par disponibilité ;
- trier les résultats.

La recherche doit être pensée pour être rapide et intuitive.

---

## 8. Demandes d'achat

Cette fonctionnalité constitue l'un des éléments différenciateurs de FarmMarket.

Un acheteur ne doit pas être obligé de chercher lui-même un producteur.

Il peut publier :

> **Exemple**
>
> Je recherche 2 tonnes de tomates
> Budget maximum : 15 000 GNF/kg
> Livraison : Conakry
> Date souhaitée : 20 novembre
> Qualité : catégorie A

Les producteurs correspondant aux critères peuvent alors consulter cette demande et proposer leurs produits.

---

## 9. Système de matching

FarmMarket doit progressivement intégrer un système permettant de rapprocher :

**Demande de l'acheteur ↔ Offre du producteur**

Les critères peuvent être :

- produit ;
- quantité ;
- prix ;
- localisation ;
- disponibilité ;
- qualité ;
- délai.

Le système pourra attribuer un score de pertinence.

Exemple :

| Producteur | Correspondance |
|---|---|
| Producteur A | 95 % |
| Producteur B | 82 % |
| Producteur C | 71 % |

Dans une première version, le matching peut être basé sur des règles simples.

Le Machine Learning ne doit pas être introduit prématurément.

---

## 10. Commandes

Lorsqu'un acheteur accepte une offre, une commande est créée.

Une commande doit contenir :

- acheteur ;
- producteur ;
- produits ;
- quantités ;
- prix ;
- montant total ;
- adresse de livraison ;
- date prévue ;
- statut.

### Statuts

La commande peut évoluer ainsi :

```
En attente → Acceptée → En préparation → Expédiée → Livrée → Terminée
```

Elle peut également être :

```
Annulée
```

Chaque changement important doit être enregistré.

---

## 11. Livraison

La gestion logistique sera développée progressivement.

Une livraison pourra contenir :

- commande ;
- point de départ ;
- destination ;
- transporteur ;
- date prévue ;
- date réelle ;
- statut.

Exemple :

```
Commande acceptée
↓
Préparation
↓
Transporteur affecté
↓
En route
↓
Livrée
↓
Réception confirmée
```

---

## 12. Traçabilité

FarmMarket doit être conçu pour pouvoir intégrer la traçabilité.

Chaque lot agricole peut posséder un identifiant unique.

Exemple :

```
LOT-2026-000124
```

Ce lot peut être associé à :

- producteur ;
- exploitation ;
- parcelle ;
- produit ;
- date de récolte ;
- quantité ;
- qualité ;
- stockage ;
- transport ;
- acheteur.

L'objectif est de pouvoir répondre à la question :

> D'où vient ce produit et quel a été son parcours ?

---

## 13. Système d'évaluation

Après une transaction, les utilisateurs peuvent s'évaluer.

Un acheteur peut évaluer :

- qualité du produit ;
- respect des délais ;
- communication ;
- fiabilité.

Le producteur peut également évaluer :

- sérieux de l'acheteur ;
- respect des engagements ;
- paiement ;
- communication.

Une note moyenne peut être affichée sur les profils.

---

## 14. Notifications

Le système doit pouvoir notifier les utilisateurs lorsqu'un événement important se produit.

Exemples :

- nouvelle demande correspondant à un produit ;
- nouvelle proposition ;
- commande acceptée ;
- commande refusée ;
- changement de statut ;
- livraison ;
- nouvelle évaluation.

Dans le MVP, les notifications peuvent commencer par des notifications internes.

Les SMS et e-mails pourront être ajoutés plus tard.

---

## 15. Tableaux de bord

### Producteur

Le dashboard doit présenter :

- nombre de produits ;
- produits disponibles ;
- demandes reçues ;
- commandes ;
- ventes ;
- revenus ;
- évaluations.

### Acheteur

Le dashboard doit présenter :

- demandes publiées ;
- propositions reçues ;
- commandes ;
- livraisons ;
- historique d'achat.

### Administrateur

Le dashboard doit présenter :

- utilisateurs ;
- producteurs ;
- acheteurs ;
- produits ;
- commandes ;
- demandes ;
- volumes ;
- signalements.

---

## 16. Statistiques

FarmMarket doit progressivement permettre d'analyser :

- produits les plus recherchés ;
- produits les plus vendus ;
- prix moyens ;
- évolution des prix ;
- volumes disponibles ;
- volumes demandés ;
- zones avec forte demande ;
- saisonnalité ;
- évolution des transactions.

Ces données pourront ensuite être utilisées pour créer des fonctionnalités intelligentes.

---

## 17. Architecture technique

Le projet doit utiliser une architecture séparant clairement le frontend et le backend.

| Domaine | Technologies |
|---|---|
| Frontend | TypeScript, React, Next.js |
| Backend | TypeScript, NestJS, API REST |
| Base de données | PostgreSQL |
| ORM | Prisma |
| Authentification | JWT |
| UI | Tailwind CSS ou système UI cohérent |
| Cartographie | Leaflet / React Leaflet |
| Graphiques | Recharts |
| Tests | Jest, Testing Library |
| Infrastructure | Docker |
| Versionnement | Git, GitHub |

---

## 18. Architecture du projet

L'architecture cible est :

```
Next.js / React / TypeScript
↓
API REST
↓
NestJS / TypeScript
↓
Prisma
↓
PostgreSQL
```

Le frontend ne doit pas accéder directement à PostgreSQL.

Toutes les opérations métier doivent passer par le backend.

---

## 19. Modules backend

Le backend devra être organisé par domaines.

Exemple :

- `auth`
- `users`
- `producers`
- `buyers`
- `farms`
- `products`
- `categories`
- `requests`
- `offers`
- `orders`
- `deliveries`
- `batches`
- `reviews`
- `notifications`
- `admin`
- `analytics`

Il faut éviter de construire un énorme module contenant toute la logique métier.

---

## 20. Principales entités

Les principales entités prévues sont :

- `User`
- `Producer`
- `Buyer`
- `Transporter`
- `Farm`
- `Product`
- `Category`
- `ProductBatch`
- `Request`
- `Offer`
- `Order`
- `OrderItem`
- `Delivery`
- `Review`
- `Notification`

Ces entités devront être reliées correctement dans PostgreSQL.

---

## 21. Règles de développement

Ces règles doivent être respectées pendant tout le projet.

### Règle 1 — TypeScript

Le projet doit utiliser TypeScript plutôt que JavaScript pur.

L'objectif est d'apprendre à construire une application fortement typée.

### Règle 2 — Pas de fonctionnalité inutile

Chaque fonctionnalité doit répondre à un besoin défini dans le cahier des charges.

Aucune fonctionnalité ne doit être ajoutée simplement parce qu'elle est techniquement intéressante.

### Règle 3 — Développement progressif

Ne pas essayer de développer FarmMarket entièrement en une seule fois.

Le projet doit être construit par étapes :

1. fondations ;
2. authentification ;
3. utilisateurs ;
4. producteurs ;
5. produits ;
6. catalogue ;
7. demandes ;
8. matching ;
9. commandes ;
10. livraison ;
11. traçabilité ;
12. analytics.

### Règle 4 — Comprendre avant d'implémenter

Avant chaque fonctionnalité :

1. comprendre le besoin ;
2. définir les données nécessaires ;
3. définir les règles métier ;
4. concevoir l'API ;
5. concevoir l'interface ;
6. implémenter ;
7. tester ;
8. corriger ;
9. documenter.

---

## 22. Tests

Les fonctionnalités importantes doivent être testées.

Minimum :

- tests unitaires backend ;
- tests des règles métier ;
- tests des services ;
- tests des composants frontend ;
- tests des parcours critiques.

Les parcours critiques comprennent notamment :

- inscription ;
- connexion ;
- création d'un produit ;
- recherche ;
- création d'une demande ;
- réponse à une demande ;
- création d'une commande ;
- changement de statut.

---

## 23. Git

Le projet doit utiliser Git dès le début.

Les commits doivent être clairs.

Exemples :

```
feat(auth): ajouter l'inscription
feat(products): créer la gestion des produits
fix(orders): corriger le calcul du montant total
test(products): ajouter les tests du service produit
refactor(requests): simplifier le matching
```

Les commits doivent représenter des changements cohérents.

---

## 24. Documentation

Le projet doit posséder un `README.md` contenant :

- présentation du projet ;
- technologies ;
- prérequis ;
- installation ;
- configuration ;
- lancement frontend ;
- lancement backend ;
- lancement PostgreSQL ;
- tests ;
- structure du projet.

L'API doit également être documentée.

Swagger/OpenAPI pourra être utilisé pour documenter le backend.

---

## 25. MVP

La première version ne doit pas contenir toutes les fonctionnalités prévues.

Le MVP doit comprendre :

**Authentification**

- inscription ;
- connexion ;
- profil.

**Producteur**

- profil ;
- création de produits ;
- modification ;
- suppression/archivage.

**Catalogue**

- liste des produits ;
- recherche ;
- filtres ;
- détail produit.

**Acheteur**

- recherche ;
- consultation ;
- demande d'achat.

**Mise en relation**

- consultation des demandes ;
- réponse des producteurs.

**Commandes**

- création ;
- acceptation ;
- suivi ;
- historique.

**Administration**

- utilisateurs ;
- produits ;
- commandes.

---

## 26. Roadmap

### Phase 1 — Fondations

- initialisation Git ;
- configuration Next.js ;
- configuration NestJS ;
- PostgreSQL ;
- Docker ;
- Prisma ;
- architecture.

### Phase 2 — Authentification

- utilisateurs ;
- inscription ;
- connexion ;
- JWT ;
- rôles.

### Phase 3 — Marketplace

- producteurs ;
- produits ;
- catégories ;
- catalogue ;
- recherche ;
- filtres.

### Phase 4 — Demandes

- création de demandes ;
- consultation ;
- réponses ;
- premières règles de matching.

### Phase 5 — Commandes

- panier ou sélection ;
- commande ;
- statuts ;
- historique.

### Phase 6 — Logistique

- transporteurs ;
- livraisons ;
- suivi.

### Phase 7 — Traçabilité

- lots ;
- origine ;
- récolte ;
- transport ;
- destination.

### Phase 8 — Analytics

- statistiques ;
- graphiques ;
- tendances ;
- prix.

### Phase 9 — Intelligence

- recommandations ;
- prévisions ;
- détection d'anomalies ;
- Machine Learning éventuel.

---

## 27. Fonctionnalités hors MVP

Les fonctionnalités suivantes ne doivent pas être développées au début :

- paiement en ligne ;
- application mobile native ;
- Machine Learning complexe ;
- intelligence artificielle générative ;
- système financier avancé ;
- blockchain ;
- intégration massive de SMS ;
- système logistique très avancé.

Elles pourront être ajoutées après stabilisation du produit principal.

---

## 28. Principes de qualité

Le code doit être :

- lisible ;
- maintenable ;
- modulaire ;
- typé ;
- testé ;
- documenté ;
- sécurisé.

Il faut éviter :

- duplication excessive ;
- fonctions gigantesques ;
- composants React trop complexes ;
- logique métier dans les composants UI ;
- accès direct à la base depuis le frontend ;
- secrets dans Git ;
- code inutilisé ;
- fonctionnalités développées sans besoin fonctionnel.

---

## 29. Critères de réussite

Le projet sera considéré comme fonctionnel lorsque :

- un utilisateur peut créer un compte ;
- un producteur peut publier un produit ;
- un acheteur peut rechercher un produit ;
- un acheteur peut publier une demande ;
- un producteur peut répondre à cette demande ;
- une commande peut être créée ;
- une commande peut évoluer à travers ses différents statuts ;
- les utilisateurs peuvent consulter leur historique ;
- les rôles et permissions fonctionnent ;
- les principales fonctionnalités disposent de tests ;
- l'application peut être exécutée localement avec une procédure documentée.

---

## 30. Vision finale

À terme, FarmMarket doit devenir plus qu'un simple marketplace.

La vision est de construire une plateforme capable de comprendre :

- l'offre agricole
- la demande
- la localisation
- la disponibilité
- les prix
- la logistique
- la traçabilité
- les données historiques

pour faciliter les échanges agricoles et fournir progressivement des recommandations utiles aux différents acteurs.

L'intelligence artificielle et le Machine Learning ne constituent donc pas le point de départ du projet. Ils représentent une évolution future basée sur les données réellement produites par la plateforme.

---

## 31. Règle finale du projet

FarmMarket doit être développé comme un véritable produit logiciel et non comme un simple exercice de programmation.

Chaque fonctionnalité doit être :

**comprise → conçue → développée → testée → vérifiée → documentée.**

Le projet doit rester suffisamment simple pour être réalisable seul, mais suffisamment structuré pour permettre son évolution vers une plateforme complète.

*Version de référence : 1.0*
