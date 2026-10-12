import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Toutes les routes exigent un jeton par défaut. @Public() marque les exceptions (inscription, connexion…).
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
