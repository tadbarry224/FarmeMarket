import { Injectable } from '@nestjs/common';
import type { Category } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // Triées par nom (la collation de la base range correctement les lettres accentuées)
  findAll(): Promise<Category[]> {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }
}
