import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../generated/prisma/client';

export const ROLES_KEY = 'roles';

// Restreint une route aux utilisateurs ayant au moins un des rôles indiqués.
// Exemple : @Roles(Role.ADMIN)
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
