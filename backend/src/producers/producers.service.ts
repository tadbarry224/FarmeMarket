import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Producer } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { UpsertProducerProfileDto } from './dto/upsert-producer-profile.dto';
import { type PublicProducer, toPublicProducer } from './public-producer';

@Injectable()
export class ProducersService {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string): Promise<Producer | null> {
    return this.prisma.producer.findUnique({ where: { userId } });
  }

  // Pour les actions qui exigent un profil producteur complété.
  // `action` complète le message, ex. « publier un produit ».
  async requireProfile(userId: string, action: string): Promise<Producer> {
    const producer = await this.findByUserId(userId);
    if (!producer) {
      throw new ForbiddenException(
        `Complétez votre profil producteur avant de ${action}.`,
      );
    }
    return producer;
  }

  async getOwnProfile(userId: string): Promise<Producer> {
    const producer = await this.findByUserId(userId);
    if (!producer) {
      throw new NotFoundException(
        "Vous n'avez pas encore créé votre profil producteur.",
      );
    }
    return producer;
  }

  // Crée le profil au premier enregistrement, le remplace ensuite
  upsertOwnProfile(
    userId: string,
    dto: UpsertProducerProfileDto,
  ): Promise<Producer> {
    // Un champ facultatif absent du formulaire efface la valeur enregistrée
    const data = {
      farmType: dto.farmType,
      region: dto.region,
      prefecture: dto.prefecture,
      commune: dto.commune ?? null,
      address: dto.address ?? null,
      description: dto.description ?? null,
      mainProducts: dto.mainProducts ?? null,
    };

    return this.prisma.producer.upsert({
      where: { userId },
      create: { ...data, user: { connect: { id: userId } } },
      update: data,
    });
  }

  async getPublicProfile(id: string): Promise<PublicProducer> {
    const producer = await this.prisma.producer.findUnique({
      where: { id },
      include: { user: { select: { fullName: true } } },
    });
    if (!producer) {
      throw new NotFoundException('Producteur introuvable.');
    }
    return toPublicProducer(producer);
  }
}
