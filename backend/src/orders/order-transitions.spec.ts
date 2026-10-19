import { OrderStatus } from '../generated/prisma/client';
import { checkOrderTransition, requiresNote } from './order-transitions';

const {
  PENDING,
  ACCEPTED,
  PREPARING,
  SHIPPED,
  DELIVERED,
  COMPLETED,
  REJECTED,
  CANCELLED,
} = OrderStatus;

describe('checkOrderTransition', () => {
  it('suit le parcours normal, chaque étape par la bonne partie', () => {
    expect(checkOrderTransition(PENDING, ACCEPTED, 'PRODUCER')).toEqual({
      allowed: true,
    });
    expect(checkOrderTransition(ACCEPTED, PREPARING, 'PRODUCER').allowed).toBe(
      true,
    );
    expect(checkOrderTransition(PREPARING, SHIPPED, 'PRODUCER').allowed).toBe(
      true,
    );
    expect(checkOrderTransition(SHIPPED, DELIVERED, 'PRODUCER').allowed).toBe(
      true,
    );
    expect(checkOrderTransition(DELIVERED, COMPLETED, 'BUYER').allowed).toBe(
      true,
    );
  });

  it("réserve chaque étape à sa partie : l'autre reçoit un refus explicite", () => {
    expect(checkOrderTransition(PENDING, ACCEPTED, 'BUYER')).toEqual({
      allowed: false,
      reason: 'forbidden',
      message: 'Ce changement de statut revient au producteur.',
    });
    expect(checkOrderTransition(DELIVERED, COMPLETED, 'PRODUCER')).toEqual({
      allowed: false,
      reason: 'forbidden',
      message: "Ce changement de statut revient à l'acheteur.",
    });
  });

  it("n'autorise pas à sauter une étape ni à revenir en arrière", () => {
    expect(checkOrderTransition(ACCEPTED, SHIPPED, 'PRODUCER')).toEqual({
      allowed: false,
      reason: 'invalid',
      message:
        'Une commande acceptée ne peut pas passer au statut « expédiée ».',
    });
    expect(checkOrderTransition(SHIPPED, PREPARING, 'PRODUCER').allowed).toBe(
      false,
    );
  });

  it("limite l'annulation selon l'avancement et la partie", () => {
    expect(checkOrderTransition(PENDING, CANCELLED, 'BUYER').allowed).toBe(
      true,
    );
    // Avant acceptation, le producteur refuse au lieu d'annuler
    expect(checkOrderTransition(PENDING, CANCELLED, 'PRODUCER').allowed).toBe(
      false,
    );
    expect(checkOrderTransition(ACCEPTED, CANCELLED, 'BUYER').allowed).toBe(
      true,
    );
    expect(checkOrderTransition(ACCEPTED, CANCELLED, 'PRODUCER').allowed).toBe(
      true,
    );
    expect(checkOrderTransition(PREPARING, CANCELLED, 'BUYER')).toMatchObject({
      allowed: false,
      reason: 'forbidden',
    });
    expect(checkOrderTransition(PREPARING, CANCELLED, 'PRODUCER').allowed).toBe(
      true,
    );
    expect(checkOrderTransition(SHIPPED, CANCELLED, 'PRODUCER')).toMatchObject({
      allowed: false,
      reason: 'invalid',
    });
  });

  it('ne permet plus aucun changement une fois la commande close', () => {
    for (const closed of [COMPLETED, REJECTED, CANCELLED]) {
      for (const to of Object.values(OrderStatus)) {
        expect(checkOrderTransition(closed, to, 'BUYER').allowed).toBe(false);
        expect(checkOrderTransition(closed, to, 'PRODUCER').allowed).toBe(
          false,
        );
      }
    }
  });
});

describe('requiresNote', () => {
  it('exige un motif seulement quand le producteur annule', () => {
    expect(requiresNote(CANCELLED, 'PRODUCER')).toBe(true);
    expect(requiresNote(CANCELLED, 'BUYER')).toBe(false);
    expect(requiresNote(REJECTED, 'PRODUCER')).toBe(false);
  });
});
