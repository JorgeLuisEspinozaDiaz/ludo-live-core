import { Module } from '@nestjs/common';
import { PermissionsSeederService } from './permissions-seeder.service';
import { MetadataScanner, Reflector } from '@nestjs/core';
import { SectionInterceptor } from 'src/common/decorators/section.decorator';

@Module({
  providers: [
    MetadataScanner,
    Reflector,
    SectionInterceptor,
    PermissionsSeederService,
  ],
  exports: [PermissionsSeederService],
})
export class PermissionsSeederModule {}
