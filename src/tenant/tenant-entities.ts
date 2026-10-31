import { Tenant } from 'src/tenant/entities/tenant.entity';
import { TenantConfig } from 'src/tenant/entities/tenant-config.entity';
import { User } from 'src/user/entities/user.entity';
import { Role } from 'src/role/entities/role.entity';
import { Permission } from 'src/permission/entities/permission.entity';
import { Menu } from 'src/menu/entities/menu.entity';
import { Section } from 'src/section/entities/section.entity';
import { GameConfig } from 'src/game-config/entities/game-config.entity';
import { Live } from 'src/live/entities/live.entity';
import { LiveParticipant } from 'src/live/entities/live-participant.entity';
import { Round } from 'src/round/entities/round.entity';
import { RoundColorStock } from 'src/round/entities/round-color-stock.entity';
import { Promo } from 'src/promo/entities/promo.entity';
import { Purchase } from 'src/purchase/entities/purchase.entity';
import { Wallet } from 'src/wallet/entities/wallet.entity';
import { WalletMovement } from 'src/wallet/entities/wallet-movement.entity';
import { PointsWallet } from 'src/points/entities/points-wallet.entity';
import { PointsMovement } from 'src/points/entities/points-movement.entity';
import { RoundHistorySnapshot } from 'src/history/entities/round-history-snapshot.entity';
import { AuditLog } from 'src/audit/entities/audit-log.entity';

/** Entidades que viven en la BD de cada tenant (no en control plane). */
export const TENANT_ENTITIES = [
  Tenant,
  TenantConfig,
  User,
  Role,
  Permission,
  Menu,
  Section,
  GameConfig,
  Live,
  LiveParticipant,
  Round,
  RoundColorStock,
  Promo,
  Purchase,
  Wallet,
  WalletMovement,
  PointsWallet,
  PointsMovement,
  RoundHistorySnapshot,
  AuditLog,
];
