import type { OrderStatus, Prisma } from '../generated/prisma/client';
import { CONTACT_VISIBLE_STATUSES, type OrderParty } from './order-transitions';

// Commande telle que la voient ses deux parties. Les téléphones ne sont montrés
// qu'une fois la commande acceptée (CONTACT_VISIBLE_STATUSES), pour organiser la livraison.
const ORDER_FIELDS = {
  id: true,
  status: true,
  totalAmount: true,
  deliveryRegion: true,
  deliveryPrefecture: true,
  deliveryCommune: true,
  deliveryAddress: true,
  deliveryDate: true,
  note: true,
  offerId: true,
  createdAt: true,
  updatedAt: true,
  // buyerId et producer.userId servent à savoir qui est qui ; ils ne sont pas renvoyés
  buyerId: true,
  buyer: { select: { fullName: true, phone: true } },
  producer: {
    select: {
      id: true,
      userId: true,
      farmType: true,
      region: true,
      prefecture: true,
      user: { select: { fullName: true, phone: true } },
    },
  },
  items: {
    select: {
      id: true,
      productId: true,
      productName: true,
      unit: true,
      unitPrice: true,
      quantity: true,
      lineTotal: true,
    },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.OrderSelect;

export const ORDER_SUMMARY_SELECT = ORDER_FIELDS;

// Détail : avec l'historique des statuts, du plus ancien au plus récent
export const ORDER_DETAIL_SELECT = {
  ...ORDER_FIELDS,
  events: {
    select: { status: true, actorId: true, note: true, createdAt: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.OrderSelect;

type OrderSummaryRow = Prisma.OrderGetPayload<{
  select: typeof ORDER_SUMMARY_SELECT;
}>;
type OrderDetailRow = Prisma.OrderGetPayload<{
  select: typeof ORDER_DETAIL_SELECT;
}>;

export interface OrderItemView {
  id: string;
  productId: string | null;
  productName: string;
  unit: OrderSummaryRow['items'][number]['unit'];
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderView {
  id: string;
  status: OrderStatus;
  // En GNF. Les montants sont limités à Number.MAX_SAFE_INTEGER à la création :
  // la conversion depuis BigInt est donc exacte.
  totalAmount: number;
  deliveryRegion: string;
  deliveryPrefecture: string;
  deliveryCommune: string | null;
  deliveryAddress: string;
  deliveryDate: Date | null;
  note: string | null;
  offerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  buyer: { fullName: string; phone: string | null };
  producer: {
    id: string;
    fullName: string;
    farmType: OrderSummaryRow['producer']['farmType'];
    region: string;
    prefecture: string;
    phone: string | null;
  };
  items: OrderItemView[];
}

export interface OrderEventView {
  status: OrderStatus;
  // Partie à l'origine du changement (null si le compte n'existe plus)
  by: OrderParty | null;
  note: string | null;
  createdAt: Date;
}

export interface OrderDetailView extends OrderView {
  events: OrderEventView[];
}

export function toOrderView(row: OrderSummaryRow): OrderView {
  const {
    buyerId: _buyerId,
    buyer,
    producer,
    items,
    totalAmount,
    ...order
  } = row;
  const showContact = CONTACT_VISIBLE_STATUSES.includes(row.status);

  return {
    ...order,
    totalAmount: Number(totalAmount),
    buyer: {
      fullName: buyer.fullName,
      phone: showContact ? buyer.phone : null,
    },
    producer: {
      id: producer.id,
      fullName: producer.user.fullName,
      farmType: producer.farmType,
      region: producer.region,
      prefecture: producer.prefecture,
      phone: showContact ? producer.user.phone : null,
    },
    items: items.map((item) => ({
      ...item,
      lineTotal: Number(item.lineTotal),
    })),
  };
}

export function toOrderDetailView(row: OrderDetailRow): OrderDetailView {
  const { events, ...summary } = row;
  return {
    ...toOrderView(summary),
    events: events.map(({ actorId, ...event }) => ({
      ...event,
      by: partyOf(row, actorId),
    })),
  };
}

// Partie de la commande correspondant à un utilisateur, ou null s'il n'en fait pas partie
export function partyOf(
  order: { buyerId: string; producer: { userId: string } },
  userId: string | null,
): OrderParty | null {
  if (userId === null) return null;
  if (userId === order.buyerId) return 'BUYER';
  if (userId === order.producer.userId) return 'PRODUCER';
  return null;
}
