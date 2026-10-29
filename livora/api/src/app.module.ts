import { Module } from '@nestjs/common';
import { AuthModule } from '@platform/auth';
import { AppUsersProvider } from './auth/app-users.provider';
import { RolesModule } from '@platform/roles';
import { AppRolesProvider } from './roles/app-roles.provider';
import { AppRolePermissionsProvider } from './roles/app-role-permissions.provider';
// __BRICK_IMPORTS__

@Module({
  controllers: [],
  imports: [
    AuthModule.forRoot({
      usersProvider: AppUsersProvider,
      jwtAccessSecret: process.env.JWT_ACCESS_SECRET!,
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
    }),
    RolesModule.forRoot({
      rolesProvider: AppRolesProvider,
      rolePermissionsProvider: AppRolePermissionsProvider,
      defaultRolePermissions: {
        premium: ['premium-content'],
        vip: ['premium-content'],
      },
    }),
    // __BRICK_MODULES__
  ],
})
export class AppModule {}
