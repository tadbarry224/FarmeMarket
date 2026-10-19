import type { ProductUnit } from '../generated/prisma/client';

// Matching v1 (cahier des charges §9) : rapproche une demande d'achat des produits d'un producteur
// à l'aide de règles simples et explicables, sans Machine Learning.
//
// Chaque produit disponible du producteur reçoit un score sur 100 ; le score de la demande
// est celui de son meilleur produit. Sans produit de la même catégorie, le score est 0.

export const MATCH_POINTS = {
  category: 30, // même catégorie : condition nécessaire
  name: 20, // le nom du produit correspond au produit recherché
  quantity: 15, // quantité suffisante, dans la même unité
  price: 15, // prix dans le budget (ou pas de budget indiqué)
  samePrefecture: 10, // produit situé dans la préfecture de livraison…
  sameRegion: 5, // … ou au moins dans la même région
  availability: 10, // disponible à la date souhaitée (ou pas de date indiquée)
} as const;

export interface MatchableRequest {
  categoryId: string;
  productName: string;
  quantity: number;
  unit: ProductUnit;
  maxPricePerUnit: number | null;
  region: string;
  prefecture: string;
  desiredDate: Date | null;
}

export interface MatchableProduct {
  id: string;
  categoryId: string;
  name: string;
  quantity: number;
  unit: ProductUnit;
  pricePerUnit: number;
  region: string;
  prefecture: string;
  availableFrom: Date | null;
  availableUntil: Date | null;
}

export interface MatchResult {
  // Pertinence de 0 à 100
  score: number;
  // Produit du producteur qui correspond le mieux, à proposer dans l'offre
  productId: string | null;
}

export function scoreProduct(
  request: MatchableRequest,
  product: MatchableProduct,
): number {
  if (product.categoryId !== request.categoryId) {
    return 0;
  }

  let score = MATCH_POINTS.category;

  if (sharesWord(request.productName, product.name)) {
    score += MATCH_POINTS.name;
  }

  // Quantités et prix ne sont comparables que dans la même unité (kg ≠ sac)
  const sameUnit = product.unit === request.unit;
  if (sameUnit && product.quantity >= request.quantity) {
    score += MATCH_POINTS.quantity;
  }
  if (
    request.maxPricePerUnit === null ||
    (sameUnit && product.pricePerUnit <= request.maxPricePerUnit)
  ) {
    score += MATCH_POINTS.price;
  }

  if (product.prefecture === request.prefecture) {
    score += MATCH_POINTS.samePrefecture;
  } else if (product.region === request.region) {
    score += MATCH_POINTS.sameRegion;
  }

  if (isAvailableOn(product, request.desiredDate)) {
    score += MATCH_POINTS.availability;
  }

  return score;
}

export function bestMatch(
  request: MatchableRequest,
  products: MatchableProduct[],
): MatchResult {
  let best: MatchResult = { score: 0, productId: null };
  for (const product of products) {
    const score = scoreProduct(request, product);
    if (score > best.score) {
      best = { score, productId: product.id };
    }
  }
  return best;
}

function isAvailableOn(product: MatchableProduct, date: Date | null): boolean {
  if (date === null) return true;
  return (
    (product.availableFrom === null || product.availableFrom <= date) &&
    (product.availableUntil === null || product.availableUntil >= date)
  );
}

// « Tomates fraîches » et « tomate » partagent le mot « tomate » :
// comparaison sans accents ni majuscules, en ignorant le pluriel (s, x final)
// et les mots de moins de 3 lettres (de, du, la…).
function sharesWord(a: string, b: string): boolean {
  const wordsOfB = new Set(words(b));
  return words(a).some((word) => wordsOfB.has(word));
}

function words(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3)
    .map((word) => word.replace(/[sx]$/, ''));
}
