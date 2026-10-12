import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { getRequiredEnv } from '../common/env';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

// En dessous, le secret pourrait être deviné par force brute
const JWT_SECRET_MIN_LENGTH = 32;
// Durée au format « nombre + unité » : 30m, 24h, 7d…
const JWT_EXPIRES_IN_FORMAT = /^\d+[smhd]$/;

@Module({
  imports: [
    UsersModule,
    // Configuré au démarrage : le serveur refuse de démarrer si la configuration JWT est absente ou invalide
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = getRequiredEnv('JWT_SECRET');
        if (secret.length < JWT_SECRET_MIN_LENGTH) {
          throw new Error(
            `JWT_SECRET doit contenir au moins ${JWT_SECRET_MIN_LENGTH} caractères.`,
          );
        }

        const expiresIn = getRequiredEnv('JWT_EXPIRES_IN');
        if (!JWT_EXPIRES_IN_FORMAT.test(expiresIn)) {
          throw new Error(
            'JWT_EXPIRES_IN doit être une durée comme 30m, 24h ou 7d.',
          );
        }

        return {
          secret,
          signOptions: { expiresIn: expiresIn as JwtSignOptions['expiresIn'] },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Guards globaux, exécutés dans cet ordre sur toutes les routes de l'application :
    // 1. JwtAuthGuard : l'utilisateur est-il connecté ? (sauf routes @Public())
    // 2. RolesGuard   : a-t-il le rôle demandé par @Roles(...) ?
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
