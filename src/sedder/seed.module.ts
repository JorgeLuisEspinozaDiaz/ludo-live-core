import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { RolesSeederService } from './roles-seeder.service';
import { PermissionsSeederModule } from './permissions-seeder.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant], 'control'),
    PermissionsSeederModule,
  ],
  providers: [RolesSeederService],
  exports: [RolesSeederService],
})
export class SeedModule {}
