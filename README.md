# WOST SPA Backend

API NestJS + PostgreSQL para gestión de spa/belleza (multi-tenant).

## Stack

- NestJS 11 + TypeORM + PostgreSQL
- Auth JWT + RBAC por permisos (`dashboard.view`, `pos.use`, etc.)
- Multi-tenant (`x-tenant-id` + JWT)

## Setup rápido

1. Crear base PostgreSQL `wost_spa`
2. Copiar `.env.example` → `.env` y ajustar credenciales
3. `npm install`
4. `npm run start:dev`
5. Swagger: http://localhost:3005/api

## Primer arranque

```http
POST /auth/bootstrap
{
  "tenantName": "Mi Spa",
  "tenantSlug": "mi-spa",
  "username": "admin",
  "password": "admin123",
  "email": "admin@spa.com",
  "adminName": "Administrador",
  "branchName": "Sucursal Principal"
}
```

Luego:

```http
POST /auth/login
{
  "username": "admin",
  "password": "admin123",
  "tenant": "mi-spa"
}
```

Usar `Authorization: Bearer <token>` y `x-tenant-id: <tenantId>` en el resto.

## Flujo crítico POS

1. Abrir caja: `POST /cash-sessions/open`
2. Cobrar: `POST /orders/checkout` (transacción atómica: orden + pagos + stock + comisión + comprobante + caja)

## Módulos

| Dominio | Rutas principales |
|---|---|
| Auth | `/auth/login`, `/bootstrap`, `/me` |
| Catálogo | `/categories`, `/brands`, `/units`, `/products` |
| Operaciones | `/areas`, `/suppliers`, `/services` |
| Inventario | `/warehouses`, `/stock/adjust`, `/stock/kardex` |
| Clientes | `/clients` |
| Staff | `/staff` |
| Caja | `/cash-registers`, `/cash-sessions/*`, `/expenses` |
| POS | `/orders`, `/orders/checkout` |
| Agenda | `/appointments` |
| Reportes | `/reports/dashboard`, `/reports/sales`, … |
| Config | `/config` |

## Fuera de v1

Facturación SUNAT, pasarela de pagos, Google OAuth, WhatsApp, membresías.
