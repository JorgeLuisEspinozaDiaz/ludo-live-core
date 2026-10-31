import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { PlatformAdmin } from './entities/platform-admin.entity';
import { PlatformAdminService } from './platform-admin.service';
import { PlatformTenantsService } from './platform-tenants.service';
import {
  PlatformAuthController,
  PlatformTenantsController,
} from './platform-tenants.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([PlatformAdmin, Tenant], 'control'),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'change-me-wost-jwt-secret'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '8h'),
        },
      }),
    }),
    forwardRef(() => AuthModule),
  ],
  controllers: [PlatformTenantsController, PlatformAuthController],
  providers: [PlatformAdminService, PlatformTenantsService],
  exports: [PlatformAdminService, TypeOrmModule],
})
export class PlatformModule {}
