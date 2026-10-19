import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { GUINEA_REGIONS } from './guinea-locations';

export interface RegionWithPrefectures {
  name: string;
  prefectures: readonly string[];
}

@Controller('locations')
export class LocationsController {
  // Liste des régions et préfectures, pour remplir les listes déroulantes et les filtres du frontend
  @Public()
  @Get()
  list(): RegionWithPrefectures[] {
    return Object.entries(GUINEA_REGIONS).map(([name, prefectures]) => ({
      name,
      prefectures,
    }));
  }
}
