import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const typeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: +(configService.get<string>('DB_PORT') ?? 5432),
  username: configService.get<string>('DB_USER', 'postgres'),
  password: configService.get<string>('DB_PASSWORD', 'postgres'),
  database: configService.get<string>('DB_NAME', 'wost_spa'),
  autoLoadEntities: true,
  synchronize: configService.get<string>('DB_SYNC', 'true') === 'true',
  logging: configService.get<string>('DB_LOGGING', 'false') === 'true',
});
