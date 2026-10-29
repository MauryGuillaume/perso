import { Injectable } from '@nestjs/common';
import { prisma } from '../prisma/client';
import { IRolePermissionsProvider, ManagedRole, MANAGED_ROLES } from '@platform/roles';

@Injectable()
export class AppRolePermissionsProvider implements IRolePermissionsProvider {
  private readonly prisma = prisma;

  async getPermissionsForRole(role: ManagedRole): Promise<string[]> {
    const rows = await this.prisma.rolePermission.findMany({ where: { role, deletedAt: null } });
    return rows.map((r) => r.permission);
  }

  async listAll(): Promise<Record<ManagedRole, string[]>> {
    const rows = await this.prisma.rolePermission.findMany({ where: { deletedAt: null } });
    const result = { admin: [], user: [], premium: [], vip: [] } as Record<ManagedRole, string[]>;
    for (const role of MANAGED_ROLES) {
      result[role] = rows.filter((r) => r.role === role).map((r) => r.permission);
    }
    return result;
  }

  // Soft delete : les permissions retirées sont marquées deletedAt plutôt que supprimées,
  // celles déjà présentes sont "ressuscitées" (deletedAt remis à null) plutôt que dupliquées.
  async setPermissionsForRole(role: ManagedRole, permissions: string[]): Promise<void> {
    const existing = await this.prisma.rolePermission.findMany({ where: { role } });
    const toKeep = new Set(permissions);

    for (const row of existing) {
      const shouldBeActive = toKeep.has(row.permission);
      const isActive = row.deletedAt === null;
      if (shouldBeActive !== isActive) {
        await this.prisma.rolePermission.update({
          where: { id: row.id },
          data: { deletedAt: shouldBeActive ? null : new Date() },
        });
      }
      toKeep.delete(row.permission);
    }

    for (const permission of toKeep) {
      await this.prisma.rolePermission.create({ data: { role, permission } });
    }
  }
}
