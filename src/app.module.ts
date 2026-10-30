import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { controlTypeOrmConfig } from './config/control-typeorm.config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { RoleModule } from './role/role.module';
import { PermissionModule } from './permission/permission.module';
import { MenuModule } from './menu/menu.module';
import { SectionModule } from './section/section.module';
import { TenantModule } from './tenant/tenant.module';
import { SeedModule } from './sedder/seed.module';
import { PermissionsSeederModule } from './sedder/permissions-seeder.module';
import { RolesSeederService } from './sedder/roles-seeder.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      name: 'control',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: controlTypeOrmConfig,
    }),
    TenantModule,
    SeedModule,
    PermissionsSeederModule,
    AuthModule,
    UserModule,
    RoleModule,
    PermissionModule,
    MenuModule,
    SectionModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly rolesSeederService: RolesSeederService) {}

  async onModuleInit() {
    await this.rolesSeederService.seed();
  }
}
