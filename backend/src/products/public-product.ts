import type { Prisma } from '../generated/prisma/client';

// Champs lus en base pour afficher un produit dans le catalogue.
// Le téléphone et l'adresse du producteur ne sont jamais lus : ils ne peuvent donc pas fuiter.
export const PUBLIC_PRODUCT_SELECT = {
  id: true,
  name: true,
  description: true,
  quantity: true,
  unit: true,
  pricePerUnit: true,
  region: true,
  prefecture: true,
  commune: true,
  availableFrom: true,
  availableUntil: true,
  quality: true,
  packaging: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true } },
  producer: {
    select: {
      id: true,
      farmType: true,
      region: true,
      prefecture: true,
      user: { select: { fullName: true } },
    },
  },
} satisfies Prisma.ProductSelect;

type ProductRow = Prisma.ProductGetPayload<{
  select: typeof PUBLIC_PRODUCT_SELECT;
}>;

// Produit tel qu'il est visible par tous (acheteurs, visiteurs)
export type PublicProduct = Omit<ProductRow, 'producer'> & {
  producer: {
    id: string;
    fullName: string;
    farmType: ProductRow['producer']['farmType'];
    region: string;
    prefecture: string;
  };
};

export function toPublicProduct(row: ProductRow): PublicProduct {
  const { producer, ...product } = row;
  return {
    ...product,
    producer: {
      id: producer.id,
      fullName: producer.user.fullName,
      farmType: producer.farmType,
      region: producer.region,
      prefecture: producer.prefecture,
    },
  };
}
