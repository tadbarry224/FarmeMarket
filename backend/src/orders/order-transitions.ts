import { OrderStatus } from '../generated/prisma/client';

// Les deux parties d'une commande
export type OrderParty = 'BUYER' | 'PRODUCER';

// Changements de statut autorisés, et qui peut les faire.
// Tout changement absent de ce tableau est refusé.
const TRANSITIONS: Partial<
  Record<OrderStatus, Partial<Record<OrderStatus, readonly OrderParty[]>>>
> = {
  [OrderStatus.PENDING]: {
    [OrderStatus.ACCEPTED]: ['PRODUCER'],
    [OrderStatus.REJECTED]: ['PRODUCER'],
    [OrderStatus.CANCELLED]: ['BUYER'],
  },
  [OrderStatus.ACCEPTED]: {
    [OrderStatus.PREPARING]: ['PRODUCER'],
    [OrderStatus.CANCELLED]: ['BUYER', 'PRODUCER'],
  },
  [OrderStatus.PREPARING]: {
    [OrderStatus.SHIPPED]: ['PRODUCER'],
    // Une fois la préparation commencée, seul le producteur peut encore annuler
    [OrderStatus.CANCELLED]: ['PRODUCER'],
  },
  [OrderStatus.SHIPPED]: {
    [OrderStatus.DELIVERED]: ['PRODUCER'],
  },
  [OrderStatus.DELIVERED]: {
    // L'acheteur confirme la réception
    [OrderStatus.COMPLETED]: ['BUYER'],
  },
};

// Statuts dans lesquels l'acheteur et le producteur voient le téléphone de l'autre :
// la commande est acceptée, ils doivent pouvoir organiser la livraison.
export const CONTACT_VISIBLE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'en attente',
  ACCEPTED: 'acceptée',
  PREPARING: 'en préparation',
  SHIPPED: 'expédiée',
  DELIVERED: 'livrée',
  COMPLETED: 'terminée',
  REJECTED: 'refusée',
  CANCELLED: 'annulée',
};

export type TransitionCheck =
  | { allowed: true }
  // `forbidden` : le changement existe mais revient à l'autre partie (403) ;
  // `invalid` : le changement n'est pas possible depuis ce statut (409)
  | { allowed: false; reason: 'forbidden' | 'invalid'; message: string };

export function checkOrderTransition(
  from: OrderStatus,
  to: OrderStatus,
  party: OrderParty,
): TransitionCheck {
  const allowedParties = TRANSITIONS[from]?.[to];
  if (!allowedParties) {
    return {
      allowed: false,
      reason: 'invalid',
      message: `Une commande ${STATUS_LABELS[from]} ne peut pas passer au statut « ${STATUS_LABELS[to]} ».`,
    };
  }
  if (!allowedParties.includes(party)) {
    return {
      allowed: false,
      reason: 'forbidden',
      message:
        party === 'BUYER'
          ? 'Ce changement de statut revient au producteur.'
          : "Ce changement de statut revient à l'acheteur.",
    };
  }
  return { allowed: true };
}

// Un producteur qui annule doit expliquer pourquoi à l'acheteur
export function requiresNote(to: OrderStatus, party: OrderParty): boolean {
  return to === OrderStatus.CANCELLED && party === 'PRODUCER';
}
