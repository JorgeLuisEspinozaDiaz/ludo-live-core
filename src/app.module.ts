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
import { GameConfigModule } from './game-config/game-config.module';
import { LiveModule } from './live/live.module';
import { RoundModule } from './round/round.module';
import { PurchaseModule } from './purchase/purchase.module';
import { PromoModule } from './promo/promo.module';
import { WalletModule } from './wallet/wallet.module';
import { PointsModule } from './points/points.module';
import { HistoryModule } from './history/history.module';
import { AuditModule } from './audit/audit.module';
import { RealtimeModule } from './realtime/realtime.module';
import { PlatformModule } from './platform/platform.module';

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
    PlatformModule,
    AuthModule,
    UserModule,
    RoleModule,
    PermissionModule,
    MenuModule,
    SectionModule,
    RealtimeModule,
    GameConfigModule,
    LiveModule,
    RoundModule,
    PurchaseModule,
    PromoModule,
    WalletModule,
    PointsModule,
    HistoryModule,
    AuditModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly rolesSeederService: RolesSeederService) {}

  async onModuleInit() {
    await this.rolesSeederService.seed();
  }
}
