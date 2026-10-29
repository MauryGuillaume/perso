import { Injectable } from '@nestjs/common';
import { prisma } from '../prisma/client';
import { IUsersProvider, AuthUser, AuthRole } from '@platform/auth';

@Injectable()
export class AppUsersProvider implements IUsersProvider {
  private readonly prisma = prisma;

  async findByEmail(email: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.toAuthUser(user) : null;
  }

  async findById(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toAuthUser(user) : null;
  }

  async countUsers(): Promise<number> {
    return this.prisma.user.count();
  }

  async createUser(data: { email: string; passwordHash: string; role: AuthRole }): Promise<AuthUser> {
    const user = await this.prisma.user.create({
      data: { email: data.email, passwordHash: data.passwordHash, role: data.role },
    });
    return this.toAuthUser(user);
  }

  async updateRefreshTokenHash(userId: string, refreshTokenHash: string | null): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash } });
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  private toAuthUser(user: { id: string; email: string; passwordHash: string; role: string; refreshTokenHash: string | null; suspended: boolean }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role as AuthRole,
      refreshTokenHash: user.refreshTokenHash,
      suspended: user.suspended,
    };
  }
}
