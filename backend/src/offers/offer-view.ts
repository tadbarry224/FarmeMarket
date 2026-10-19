import type { Prisma } from '../generated/prisma/client';

// Offre telle que la voient ses deux parties (le producteur qui l'a faite, l'acheteur qui l'a reçue) :
// avec un résumé de la demande et le profil public du producteur, sans téléphone ni adresse.
export const OFFER_VIEW_SELECT = {
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
  request: {
    select: {
      id: true,
      productName: true,
      quantity: true,
      unit: true,
      maxPricePerUnit: true,
      region: true,
      prefecture: true,
      desiredDate: true,
      status: true,
      category: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.OfferSelect;

type OfferViewRow = Prisma.OfferGetPayload<{
  select: typeof OFFER_VIEW_SELECT;
}>;

export type OfferView = Omit<OfferViewRow, 'producer'> & {
  producer: {
    id: string;
    fullName: string;
    farmType: OfferViewRow['producer']['farmType'];
    region: string;
    prefecture: string;
  };
};

export function toOfferView(row: OfferViewRow): OfferView {
  const { producer, ...offer } = row;
  return {
    ...offer,
    producer: {
      id: producer.id,
      fullName: producer.user.fullName,
      farmType: producer.farmType,
      region: producer.region,
      prefecture: producer.prefecture,
    },
  };
}
