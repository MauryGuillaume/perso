import { Injectable } from '@nestjs/common';
import { prisma } from '../prisma/client';
import { IRolesProvider, ManagedRole, ManagedUser } from '@platform/roles';

@Injectable()
export class AppRolesProvider implements IRolesProvider {
  private readonly prisma = prisma;

  async listUsers(): Promise<ManagedUser[]> {
    const users = await this.prisma.user.findMany();
    const permissions = await this.prisma.userPermission.findMany({ where: { deletedAt: null } });
    return users.map((u) => this.toManagedUser(u, permissions.filter((p) => p.userId === u.id)));
  }

  async findById(userId: string): Promise<ManagedUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    const permissions = await this.prisma.userPermission.findMany({ where: { userId, deletedAt: null } });
    return this.toManagedUser(user, permissions);
  }

  async setRole(userId: string, role: ManagedRole): Promise<ManagedUser> {
    await this.prisma.user.update({ where: { id: userId }, data: { role } });
    return (await this.findById(userId))!;
  }

  async setSuspended(userId: string, suspended: boolean): Promise<ManagedUser> {
    await this.prisma.user.update({ where: { id: userId }, data: { suspended } });
    return (await this.findById(userId))!;
  }

  async grantUserPermission(userId: string, permission: string): Promise<ManagedUser> {
    // "update: { deletedAt: null }" ressuscite un override précédemment révoqué (soft delete)
    // au lieu d'en créer un doublon, la contrainte @@unique([userId, permission]) portant sur
    // la ligne y compris quand elle est soft-deleted.
    await this.prisma.userPermission.upsert({
      where: { userId_permission: { userId, permission } },
      create: { userId, permission },
      update: { deletedAt: null },
    });
    return (await this.findById(userId))!;
  }

  async revokeUserPermission(userId: string, permission: string): Promise<ManagedUser> {
    await this.prisma.userPermission.updateMany({
      where: { userId, permission, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return (await this.findById(userId))!;
  }

  private toManagedUser(
    user: { id: string; email: string; role: string; suspended: boolean },
    permissions: { permission: string }[],
  ): ManagedUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role as ManagedRole,
      permissions: permissions.map((p) => p.permission),
      suspended: user.suspended,
    };
  }
}
