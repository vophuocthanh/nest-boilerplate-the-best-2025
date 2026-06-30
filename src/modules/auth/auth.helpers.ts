import { HttpException, HttpStatus } from '@nestjs/common';

import { createHash, timingSafeEqual } from 'crypto';

import { PrismaService } from '@app/src/prisma/prisma.service';

import { SafeUser, UserWithRole } from './types/auth.types';

/** Default role assigned to newly created users */
export const DEFAULT_ROLE = 'USER';

/** Hash a token (SHA-256) before storing so it can be looked up without persisting the raw token */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Constant-time string comparison to avoid timing attacks (e.g. verification codes) */
export function safeEqual(a: string, b: string): boolean {
  // Uint8Array.from gives an explicit ArrayBuffer backing (compatible with newer @types/node)
  const bufA = Uint8Array.from(Buffer.from(a));
  const bufB = Uint8Array.from(Buffer.from(b));
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/** Map a User (with role) to a client-safe shape (without the password) */
export function formatUserResponse(user: UserWithRole): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
  };
}

/** Get the default role; fail-fast if the USER role has not been seeded */
export async function getDefaultRole(prisma: PrismaService) {
  const defaultRole = await prisma.role.findUnique({
    where: { name: DEFAULT_ROLE },
  });
  if (!defaultRole) {
    throw new HttpException(
      { message: { role: 'Không tìm thấy vai trò mặc định' } },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
  return defaultRole;
}

/** Resolve the bcrypt cost factor from config (defaults to 12) */
export function resolveBcryptRounds(rounds: number | undefined): number {
  return rounds ?? 12;
}
