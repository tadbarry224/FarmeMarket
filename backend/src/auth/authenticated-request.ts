import type { Request } from 'express';
import type { JwtPayload } from './jwt-payload';

// Requête après passage du JwtAuthGuard : le contenu du jeton est disponible dans `user`
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
