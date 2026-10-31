# ludo-live-core

API NestJS + PostgreSQL multi-tenant para **rondas de Ludo en vivo** con apuestas por colores.

## Stack

- NestJS 11 + TypeORM + PostgreSQL (BD dedicada por tenant)
- Auth JWT + RBAC por permisos
- Socket.IO (+ Redis adapter) y LiveKit (tokens WebRTC)
- Montos en **céntimos** (`bigint`)

## Módulos

| Dominio | Rutas |
|---|---|
| Auth | `/auth/login`, `/auth/bootstrap`, `/auth/me` |
| Usuarios / participantes | `/users`, `/users/participants`, `/users/:id/reset-password` |
| Transmisiones | `/lives`, `/lives/:id/start\|end\|token` |
| Rondas | `/lives/:liveId/rounds`, `/rounds/:id/*` |
| Compras / promos | `/rounds/:id/purchases`, `/rounds/:id/promos`, `/purchases/:id/cancel` |
| Mochila / puntos | `/wallets/*`, `/points/*` |
| Historial / auditoría | `/history/rounds`, `/audit` |
| Config juego | `/game-config` |

## Arranque rápido

```bash
docker compose up -d postgres redis livekit
cp .env.example .env
npm install
npm run start:dev
```

Swagger: http://localhost:3005/api

### Bootstrap

```http
POST /auth/bootstrap
{
  "tenantName": "Mi Casa",
  "tenantSlug": "mi-casa",
  "username": "admin",
  "password": "admin123"
}
```

## Migraciones por tenant

Las tablas de juego viven **solo** en la BD del tenant. Se aplican:

1. Al crear el tenant (`/auth/bootstrap` / provision)
2. A todos los existentes: `npm run migrate:tenants`

En producción: `DB_SYNC=false`.

## Flujo de una ronda

1. Admin crea live → `POST /lives` → `POST /lives/:id/start`
2. Crea ronda → `POST /lives/:liveId/rounds` (copia `game_config`)
3. (Opcional) promo → `POST /rounds/:id/promos`
4. Abre compras → `POST /rounds/:id/open-purchases`
5. Participante compra → `POST /rounds/:id/purchases` `{ color, quantity, promoId? }`
6. Cierra compras → `POST /rounds/:id/close-purchases`
7. Finaliza con color ganador → `POST /rounds/:id/finish` `{ winnerColor }`  
   Liquidación atómica: premios + puntos + snapshot de historial
8. Admin registra pagos externos → `POST /wallets/:userId/payments`
9. Canje de puntos → `POST /points/redeem`

Socket.IO namespace `/live`: autenticar con JWT (`auth.token`), `joinLive { liveId }`.

## Pruebas

```bash
npm test                          # unitarias (math)
RUN_INTEGRATION=1 npm run test:integration   # requiere Postgres
```

## Supuestos

- El saldo puede quedar negativo al comprar; no hay tope de deuda automático.
- El multiplicador de promo solo afecta **puntos**, nunca soles ni premio.
- Roles sembrados: `Administrador` (todos los permisos) y `Participante`.
- API siempre en céntimos; el front formatea a soles.
- Una sola ronda activa por transmisión (índice único parcial).
