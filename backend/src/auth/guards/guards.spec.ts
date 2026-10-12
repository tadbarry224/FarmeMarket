import {
  type ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../../generated/prisma/client';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { JwtPayload } from '../jwt-payload';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

// Simule une requête HTTP arrivant sur une route portant les métadonnées indiquées
function createContext(
  request: { headers: Record<string, string>; user?: JwtPayload },
  metadata: Record<string, unknown> = {},
) {
  const handler = () => undefined;
  for (const [key, value] of Object.entries(metadata)) {
    Reflect.defineMetadata(key, value, handler);
  }
  return {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const jwtService = new JwtService({ secret: 'secret-de-test-uniquement' });
  const guard = new JwtAuthGuard(jwtService, new Reflector());

  it('laisse passer une route @Public() sans jeton', async () => {
    const context = createContext({ headers: {} }, { [IS_PUBLIC_KEY]: true });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('refuse une requête sans jeton', async () => {
    await expect(
      guard.canActivate(createContext({ headers: {} })),
    ).rejects.toThrow(new UnauthorizedException('Vous devez être connecté.'));
  });

  it('refuse un jeton signé avec un autre secret', async () => {
    const forged = new JwtService({ secret: 'secret-du-pirate' }).sign({
      sub: 'user-1',
      roles: [Role.ADMIN],
    });
    const context = createContext({
      headers: { authorization: `Bearer ${forged}` },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('refuse un jeton expiré', async () => {
    const expired = jwtService.sign(
      { sub: 'user-1', roles: [] },
      { expiresIn: -10 },
    );
    const context = createContext({
      headers: { authorization: `Bearer ${expired}` },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException(
        'Session expirée ou invalide. Veuillez vous reconnecter.',
      ),
    );
  });

  it('accepte un jeton valide et expose son contenu dans la requête', async () => {
    const token = jwtService.sign({ sub: 'user-1', roles: [Role.BUYER] });
    const request = {
      headers: { authorization: `Bearer ${token}` },
    } as { headers: Record<string, string>; user?: JwtPayload };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user).toMatchObject({ sub: 'user-1', roles: [Role.BUYER] });
  });
});

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());
  const buyer: JwtPayload = { sub: 'user-1', roles: [Role.BUYER] };

  it('laisse passer une route sans @Roles()', () => {
    expect(guard.canActivate(createContext({ headers: {}, user: buyer }))).toBe(
      true,
    );
  });

  it("laisse passer un utilisateur ayant l'un des rôles demandés", () => {
    const context = createContext(
      { headers: {}, user: buyer },
      { [ROLES_KEY]: [Role.PRODUCER, Role.BUYER] },
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it("refuse un utilisateur n'ayant pas le rôle demandé", () => {
    const context = createContext(
      { headers: {}, user: buyer },
      { [ROLES_KEY]: [Role.ADMIN] },
    );

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
