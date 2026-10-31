export enum EntityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum PermissionCode {
  DASHBOARD_VIEW = 'dashboard.view',
  SYSTEM_ADMIN = 'system.admin',
  LIVE_MANAGE = 'live.manage',
  LIVE_VIEW = 'live.view',
  ROUND_MANAGE = 'round.manage',
  ROUND_VIEW = 'round.view',
  PROMO_MANAGE = 'promo.manage',
  PURCHASE_CREATE = 'purchase.create',
  PURCHASE_CANCEL = 'purchase.cancel',
  WALLET_VIEW_OWN = 'wallet.view.own',
  WALLET_VIEW_ALL = 'wallet.view.all',
  WALLET_PAYMENT = 'wallet.payment',
  WALLET_ADJUST = 'wallet.adjust',
  POINTS_REDEEM = 'points.redeem',
  POINTS_ADJUST = 'points.adjust',
  HISTORY_VIEW = 'history.view',
  HISTORY_EXPORT = 'history.export',
  GAME_CONFIG = 'game.config',
  AUDIT_VIEW = 'audit.view',
}

export enum LiveStatus {
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  ENDED = 'ENDED',
}

export enum RoundStatus {
  CREATED = 'CREATED',
  PURCHASES_OPEN = 'PURCHASES_OPEN',
  PURCHASES_CLOSED = 'PURCHASES_CLOSED',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}

export enum LudoColor {
  ROJO = 'ROJO',
  VERDE = 'VERDE',
  AMARILLO = 'AMARILLO',
  NARANJA = 'NARANJA',
  MORADO = 'MORADO',
  AZUL = 'AZUL',
}

export enum PurchaseStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
}

export enum WalletMovementType {
  PURCHASE = 'PURCHASE',
  PURCHASE_CANCEL = 'PURCHASE_CANCEL',
  PAYMENT = 'PAYMENT',
  PRIZE = 'PRIZE',
  POINTS_REDEMPTION = 'POINTS_REDEMPTION',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum PointsMovementType {
  EARNED = 'EARNED',
  REDEEMED = 'REDEEMED',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum WalletVisualStatus {
  NEGATIVE = 'NEGATIVE',
  ZERO = 'ZERO',
  POSITIVE = 'POSITIVE',
}

/** Permisos del rol Participante (semilla). */
export const PARTICIPANT_PERMISSIONS: PermissionCode[] = [
  PermissionCode.LIVE_VIEW,
  PermissionCode.ROUND_VIEW,
  PermissionCode.PURCHASE_CREATE,
  PermissionCode.WALLET_VIEW_OWN,
  PermissionCode.POINTS_REDEEM,
  PermissionCode.HISTORY_VIEW,
];

/** Permisos de juego del Administrador (además de system.admin). */
export const ADMIN_GAME_PERMISSIONS: PermissionCode[] = [
  PermissionCode.LIVE_MANAGE,
  PermissionCode.LIVE_VIEW,
  PermissionCode.ROUND_MANAGE,
  PermissionCode.ROUND_VIEW,
  PermissionCode.PROMO_MANAGE,
  PermissionCode.PURCHASE_CANCEL,
  PermissionCode.WALLET_VIEW_OWN,
  PermissionCode.WALLET_VIEW_ALL,
  PermissionCode.WALLET_PAYMENT,
  PermissionCode.WALLET_ADJUST,
  PermissionCode.POINTS_ADJUST,
  PermissionCode.HISTORY_VIEW,
  PermissionCode.HISTORY_EXPORT,
  PermissionCode.GAME_CONFIG,
  PermissionCode.AUDIT_VIEW,
];

export const LUDO_COLORS = Object.values(LudoColor);

export const ROLE_ADMIN = 'Administrador';
export const ROLE_PARTICIPANT = 'Participante';
