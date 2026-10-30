import { Module } from '@nestjs/common';
import { TenantOrmModule } from 'src/tenant/tenant-orm.module';
import { Menu } from './entities/menu.entity';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';

@Module({
  imports: [TenantOrmModule.forFeature([Menu])],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
