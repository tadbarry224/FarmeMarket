import { Controller, Get } from '@nestjs/common';
import type { Category } from '../generated/prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // Pour le formulaire de création de produit et le filtre du catalogue
  @Public()
  @Get()
  findAll(): Promise<Category[]> {
    return this.categoriesService.findAll();
  }
}
