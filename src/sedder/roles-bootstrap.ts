import { EntityManager } from 'typeorm';
import { Role } from 'src/role/entities/role.entity';
import { Permission } from 'src/permission/entities/permission.entity';
import { GameConfig } from 'src/game-config/entities/game-config.entity';
import {
  ADMIN_GAME_PERMISSIONS,
  PARTICIPANT_PERMISSIONS,
  PermissionCode,
  ROLE_ADMIN,
  ROLE_PARTICIPANT,
} from 'src/common/enums';

export async function ensureGameRolesAndConfig(
  manager: EntityManager,
  tenantId: string,
) {
  const allPermissions = await manager.find(Permission);
  const byCode = new Map(allPermissions.map((p) => [p.code, p]));

  // Administrador: todos los permisos
  let admin = await manager.findOne(Role, {
    where: { tenantId, name: ROLE_ADMIN },
    relations: ['permissions'],
  });
  if (!admin) {
    admin = manager.create(Role, {
      tenantId,
      name: ROLE_ADMIN,
      description: 'Acceso total al sistema',
      permissions: allPermissions,
    });
  } else {
    admin.permissions = allPermissions;
  }
  await manager.save(admin);

  // Asegurar códigos de juego presentes en admin (por si faltan)
  const adminCodes = new Set([
    ...ADMIN_GAME_PERMISSIONS,
    PermissionCode.SYSTEM_ADMIN,
    PermissionCode.DASHBOARD_VIEW,
  ]);
  admin.permissions = allPermissions.filter(
    (p) =>
      adminCodes.has(p.code as PermissionCode) ||
      p.code === PermissionCode.SYSTEM_ADMIN ||
      true, // admin tiene todos
  );
  // Reasignar todos siempre
  admin.permissions = allPermissions;
  await manager.save(admin);

  // Participante
  const participantPerms = PARTICIPANT_PERMISSIONS.map((c) => byCode.get(c)).filter(
    Boolean,
  ) as Permission[];
  let participant = await manager.findOne(Role, {
    where: { tenantId, name: ROLE_PARTICIPANT },
    relations: ['permissions'],
  });
  if (!participant) {
    participant = manager.create(Role, {
      tenantId,
      name: ROLE_PARTICIPANT,
      description: 'Participante de rondas Ludo',
      permissions: participantPerms,
    });
  } else {
    participant.permissions = participantPerms;
  }
  await manager.save(participant);

  let gameConfig = await manager.findOne(GameConfig, { where: { tenantId } });
  if (!gameConfig) {
    gameConfig = await manager.save(
      manager.create(GameConfig, {
        tenantId,
        priceCents: 200,
        prizeCents: 1000,
        slotsPerColor: 50,
        pointsPerSol: 10,
        centsPerRedeemUnit: 100,
        minRedeemPoints: 10,
        redeemPointsMultiple: 10,
      }),
    );
  }

  return { admin, participant, gameConfig };
}
