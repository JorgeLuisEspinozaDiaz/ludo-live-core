import { Module } from '@nestjs/common';
import { TenantOrmModule } from 'src/tenant/tenant-orm.module';
import { Section } from './entities/section.entity';
import { SectionService } from './section.service';
import { SectionController } from './section.controller';

@Module({
  imports: [TenantOrmModule.forFeature([Section])],
  controllers: [SectionController],
  providers: [SectionService],
  exports: [SectionService],
})
export class SectionModule {}
