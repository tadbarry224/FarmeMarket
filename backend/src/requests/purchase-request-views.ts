import { OfferStatus, type Prisma } from '../generated/prisma/client';
import type { MatchResult } from './matching';

// Ce que chacun voit d'une demande d'achat :
// - l'acheteur auteur : toute sa demande et les offres reçues ;
// - les producteurs : la demande, le nom de l'acheteur (sans téléphone) et leur propre offre uniquement.
// Les offres retirées par leur producteur ne sont montrées à personne d'autre que lui.

// Champs de la demande communs à toutes les vues (l'identifiant de l'acheteur n'est pas exposé)
const REQUEST_FIELDS = {
  id: true,
  productName: true,
  quantity: true,
  unit: true,
  maxPricePerUnit: true,
  region: true,
  prefecture: true,
  commune: true,
  desiredDate: true,
  quality: true,
  details: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true } },
} satisfies Prisma.PurchaseRequestSelect;

export const VISIBLE_OFFERS = {
  status: { not: OfferStatus.WITHDRAWN },
} satisfies Prisma.OfferWhereInput;

// Offre telle que l'acheteur la voit : avec le profil public du producteur
const OFFER_FOR_BUYER = {
  id: true,
  quantity: true,
  pricePerUnit: true,
  availableFrom: true,
  message: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  product: { select: { id: true, name: true } },
  producer: {
    select: {
      id: true,
      farmType: true,
      region: true,
      prefecture: true,
      user: { select: { fullName: true } },
    },
  },
} satisfies Prisma.OfferSelect;

// Liste « mes demandes » de l'acheteur
export const BUYER_REQUEST_SUMMARY = {
  ...REQUEST_FIELDS,
  _count: { select: { offers: { where: VISIBLE_OFFERS } } },
} satisfies Prisma.PurchaseRequestSelect;

type BuyerRequestSummaryRow = Prisma.PurchaseRequestGetPayload<{
  select: typeof BUYER_REQUEST_SUMMARY;
}>;

export type BuyerRequestSummary = Omit<BuyerRequestSummaryRow, '_count'> & {
  offerCount: number;
};

export function toBuyerRequestSummary(
  row: BuyerRequestSummaryRow,
): BuyerRequestSummary {
  const { _count, ...request } = row;
  return { ...request, offerCount: _count.offers };
}

// Détail d'une demande pour son auteur
export const BUYER_REQUEST_DETAIL = {
  ...REQUEST_FIELDS,
  offers: {
    where: VISIBLE_OFFERS,
    select: OFFER_FOR_BUYER,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.PurchaseRequestSelect;

type BuyerRequestDetailRow = Prisma.PurchaseRequestGetPayload<{
  select: typeof BUYER_REQUEST_DETAIL;
}>;
type OfferForBuyerRow = BuyerRequestDetailRow['offers'][number];

export type OfferForBuyer = Omit<OfferForBuyerRow, 'producer'> & {
  producer: {
    id: string;
    fullName: string;
    farmType: OfferForBuyerRow['producer']['farmType'];
    region: string;
    prefecture: string;
  };
};

export type BuyerRequestDetail = Omit<BuyerRequestDetailRow, 'offers'> & {
  offers: OfferForBuyer[];
};

export function toBuyerRequestDetail(
  row: BuyerRequestDetailRow,
): BuyerRequestDetail {
  return {
    ...row,
    offers: row.offers.map(({ producer, ...offer }) => ({
      ...offer,
      producer: {
        id: producer.id,
        fullName: producer.user.fullName,
        farmType: producer.farmType,
        region: producer.region,
        prefecture: producer.prefecture,
      },
    })),
  };
}

// Demande telle qu'un producteur la voit. `offers` est filtré sur le producteur
// au moment de la requête (voir producerRequestSelect) : il contient au plus son offre.
export function producerRequestSelect(producerId: string) {
  return {
    ...REQUEST_FIELDS,
    buyer: { select: { fullName: true } },
    offers: {
      where: { producerId },
      select: {
        id: true,
        quantity: true,
        pricePerUnit: true,
        availableFrom: true,
        message: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        product: { select: { id: true, name: true } },
      },
    },
  } satisfies Prisma.PurchaseRequestSelect;
}

type ProducerRequestRow = Prisma.PurchaseRequestGetPayload<{
  select: ReturnType<typeof producerRequestSelect>;
}>;

export type ProducerRequestView = Omit<ProducerRequestRow, 'offers'> & {
  // Pertinence de la demande pour ce producteur (matching v1)
  match: MatchResult;
  myOffer: ProducerRequestRow['offers'][number] | null;
};

export function toProducerRequestView(
  row: ProducerRequestRow,
  match: MatchResult,
): ProducerRequestView {
  const { offers, ...request } = row;
  return { ...request, match, myOffer: offers[0] ?? null };
}
