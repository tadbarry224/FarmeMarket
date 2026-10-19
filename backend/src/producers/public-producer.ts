import type { Producer, User } from '../generated/prisma/client';

// Profil producteur visible par tous (acheteurs, visiteurs).
// Le téléphone, l'adresse précise et l'identifiant du compte ne sont pas exposés.
export interface PublicProducer {
  id: string;
  fullName: string;
  farmType: Producer['farmType'];
  description: string | null;
  region: string;
  prefecture: string;
  commune: string | null;
  mainProducts: string | null;
  createdAt: Date;
}

export function toPublicProducer(
  producer: Producer & { user: Pick<User, 'fullName'> },
): PublicProducer {
  return {
    id: producer.id,
    fullName: producer.user.fullName,
    farmType: producer.farmType,
    description: producer.description,
    region: producer.region,
    prefecture: producer.prefecture,
    commune: producer.commune,
    mainProducts: producer.mainProducts,
    createdAt: producer.createdAt,
  };
}
