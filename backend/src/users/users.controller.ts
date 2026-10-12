import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload';
import { type PublicUser, toPublicUser } from './public-user';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Profil de l'utilisateur connecté (route protégée par le JwtAuthGuard global)
  @Get('me')
  async getProfile(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<PublicUser> {
    const user = await this.usersService.findById(currentUser.sub);
    if (!user) {
      // Compte supprimé alors que son jeton est encore valide
      throw new UnauthorizedException('Vous devez être connecté.');
    }
    return toPublicUser(user);
  }
}
