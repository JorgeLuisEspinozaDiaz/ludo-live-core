# ludo-live-core

API NestJS + PostgreSQL multi-tenant (core de identidad y acceso).

## Stack

- NestJS 11 + TypeORM + PostgreSQL
- Auth JWT + RBAC por permisos
- Multi-tenant (BD dedicada por tenant)

## Módulos

| Dominio | Rutas principales |
|---|---|
| Auth | `/auth/login`, `/auth/bootstrap`, `/auth/me` |
| Usuarios | `/users` |
| Roles | `/roles` |
| Permisos | `/permissions` |
| Menús | `/menus` |
| Secciones | `/sections` |
| Tenant | `/tenants`, `/config` |

## Setup rápido

1. Crear base PostgreSQL de control
2. Copiar `.env.example` → `.env` y ajustar credenciales
3. `npm install`
4. `npm run start:dev`
5. Swagger: http://localhost:3005/api

## Primer arranque

```http
POST /auth/bootstrap
{
  "tenantName": "Mi Empresa",
  "tenantSlug": "mi-empresa",
  "username": "admin",
  "password": "admin123",
  "email": "admin@empresa.com"
}
```

Luego:

```http
POST /auth/login
{
  "username": "admin",
  "password": "admin123",
  "tenant": "mi-empresa"
}
```

Usar `Authorization: Bearer <token>` en el resto de endpoints.
