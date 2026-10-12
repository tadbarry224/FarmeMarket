import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../authenticated-request';
import type { JwtPayload } from '../jwt-payload';

// Injecte dans un paramètre de route le contenu du jeton de l'utilisateur connecté.
// Exemple : getProfile(@CurrentUser() user: JwtPayload)
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
