import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';
import { DataSource } from 'typeorm';

// Zona horaria de negocio (Perú). Debe ir antes de crear la app.
process.env.TZ = process.env.APP_TZ || 'America/Lima';

async function ensureControlDatabase() {
  const host = process.env.CONTROL_DB_HOST || process.env.DB_HOST || 'localhost';
  const port = +(process.env.CONTROL_DB_PORT || process.env.DB_PORT || 5432);
  const username =
    process.env.CONTROL_DB_USER || process.env.DB_USER || 'postgres';
  const password =
    process.env.CONTROL_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres';
  const database =
    process.env.CONTROL_DB_NAME || process.env.DB_NAME || 'wost_control';

  const admin = new DataSource({
    type: 'postgres',
    host,
    port,
    username,
    password,
    database: 'postgres',
  });
  await admin.initialize();
  try {
    const rows = await admin.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [database],
    );
    if (!rows.length) {
      await admin.query(`CREATE DATABASE "${database}"`);
      console.log(`BD de control creada: ${database}`);
    }
  } finally {
    await admin.destroy();
  }
}

async function bootstrap() {
  await ensureControlDatabase();

  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('WOST SPA API')
    .setDescription(
      'API de gestión para spa/belleza: catálogo, agenda, POS, caja, inventario y reportes',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey(
      { type: 'apiKey', name: 'x-tenant-id', in: 'header' },
      'tenant',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const corsOrigin = process.env.CORS_ORIGIN || '*';
  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(','),
    credentials: true,
  });

  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  const port = process.env.PORT || 3005;
  await app.listen(port);
  console.log(`WOST SPA API escuchando en http://localhost:${port}`);
  console.log(`Swagger: http://localhost:${port}/api`);
  console.log(`Timezone: ${process.env.TZ}`);
}
bootstrap();
