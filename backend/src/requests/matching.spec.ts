import { ProductUnit } from '../generated/prisma/client';
import {
  bestMatch,
  type MatchableProduct,
  type MatchableRequest,
  scoreProduct,
} from './matching';

// « Je recherche 2 tonnes de tomates, 15 000 GNF/kg maximum, livraison à Conakry le 20 novembre »
const request: MatchableRequest = {
  categoryId: 'legumes',
  productName: 'Tomates',
  quantity: 2000,
  unit: ProductUnit.KG,
  maxPricePerUnit: 15000,
  region: 'Conakry',
  prefecture: 'Conakry',
  desiredDate: new Date('2026-11-20T00:00:00.000Z'),
};

// Produit qui remplit tous les critères
const perfect: MatchableProduct = {
  id: 'p1',
  categoryId: 'legumes',
  name: 'Tomate fraîche',
  quantity: 3000,
  unit: ProductUnit.KG,
  pricePerUnit: 12000,
  region: 'Conakry',
  prefecture: 'Conakry',
  availableFrom: null,
  availableUntil: null,
};

describe('scoreProduct', () => {
  it('donne 100 à un produit qui remplit tous les critères', () => {
    expect(scoreProduct(request, perfect)).toBe(100);
  });

  it("donne 0 à un produit d'une autre catégorie, même s'il remplit le reste", () => {
    expect(scoreProduct(request, { ...perfect, categoryId: 'fruits' })).toBe(0);
  });

  it('retire les points de chaque critère non rempli', () => {
    expect(scoreProduct(request, { ...perfect, name: 'Oignons' })).toBe(80);
    expect(scoreProduct(request, { ...perfect, quantity: 500 })).toBe(85);
    expect(scoreProduct(request, { ...perfect, pricePerUnit: 16000 })).toBe(85);
    expect(
      scoreProduct(request, {
        ...perfect,
        availableFrom: new Date('2026-12-01T00:00:00.000Z'),
      }),
    ).toBe(90);
  });

  it('donne moins de points pour la même région que pour la même préfecture', () => {
    const kindia = { ...request, region: 'Kindia', prefecture: 'Coyah' };

    expect(
      scoreProduct(kindia, {
        ...perfect,
        region: 'Kindia',
        prefecture: 'Coyah',
      }),
    ).toBe(100);
    expect(
      scoreProduct(kindia, {
        ...perfect,
        region: 'Kindia',
        prefecture: 'Dubréka',
      }),
    ).toBe(95);
    expect(
      scoreProduct(kindia, { ...perfect, region: 'Labé', prefecture: 'Labé' }),
    ).toBe(90);
  });

  it("ne compare ni quantité ni prix quand l'unité diffère", () => {
    expect(scoreProduct(request, { ...perfect, unit: ProductUnit.BAG })).toBe(
      70,
    );
  });

  it('accorde les points quand le budget ou la date ne sont pas précisés', () => {
    const open = { ...request, maxPricePerUnit: null, desiredDate: null };

    expect(
      scoreProduct(open, {
        ...perfect,
        pricePerUnit: 99000,
        availableFrom: new Date('2099-01-01T00:00:00.000Z'),
      }),
    ).toBe(100);
  });

  it('compare les noms sans accents, majuscules ni pluriel', () => {
    const maize = { ...request, productName: 'MAÏS jaune' };

    expect(scoreProduct(maize, { ...perfect, name: 'maïs' })).toBe(100);
    expect(scoreProduct(maize, { ...perfect, name: 'Riz de Kindia' })).toBe(80);
  });
});

describe('bestMatch', () => {
  it('retient le meilleur produit du producteur', () => {
    const onions = { ...perfect, id: 'p2', name: 'Oignons' };

    expect(bestMatch(request, [onions, perfect])).toEqual({
      score: 100,
      productId: 'p1',
    });
  });

  it('renvoie un score nul sans produit correspondant', () => {
    expect(bestMatch(request, [])).toEqual({ score: 0, productId: null });
    expect(
      bestMatch(request, [{ ...perfect, categoryId: 'cereales' }]),
    ).toEqual({ score: 0, productId: null });
  });
});
