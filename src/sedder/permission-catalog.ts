import { EntityManager } from 'typeorm';
import { Menu } from 'src/menu/entities/menu.entity';
import { Section } from 'src/section/entities/section.entity';
import { Permission } from 'src/permission/entities/permission.entity';
import { PermissionCode } from 'src/common/enums';

export type NavSectionDef = {
  name: string;
  order: number;
  route?: string;
  permissions: PermissionCode[];
};

export type NavMenuDef = {
  name: string;
  order: number;
  sections: NavSectionDef[];
};

export const NAV_CATALOG: NavMenuDef[] = [
  {
    name: 'PRINCIPAL',
    order: 1,
    sections: [
      {
        name: 'Dashboard',
        order: 1,
        route: '/dashboard',
        permissions: [PermissionCode.DASHBOARD_VIEW],
      },
    ],
  },
  {
    name: 'JUEGO',
    order: 2,
    sections: [
      {
        name: 'Transmisiones',
        order: 1,
        route: '/lives',
        permissions: [PermissionCode.LIVE_VIEW, PermissionCode.LIVE_MANAGE],
      },
      {
        name: 'Rondas',
        order: 2,
        route: '/rounds',
        permissions: [PermissionCode.ROUND_VIEW, PermissionCode.ROUND_MANAGE],
      },
      {
        name: 'Mochilas',
        order: 3,
        route: '/wallets',
        permissions: [
          PermissionCode.WALLET_VIEW_OWN,
          PermissionCode.WALLET_VIEW_ALL,
        ],
      },
      {
        name: 'Pagos',
        order: 4,
        route: '/wallets/payments',
        permissions: [PermissionCode.WALLET_PAYMENT],
      },
      {
        name: 'Historial',
        order: 5,
        route: '/history',
        permissions: [PermissionCode.HISTORY_VIEW],
      },
      {
        name: 'Configuración del juego',
        order: 6,
        route: '/game-config',
        permissions: [PermissionCode.GAME_CONFIG],
      },
      {
        name: 'Auditoría',
        order: 7,
        route: '/audit',
        permissions: [PermissionCode.AUDIT_VIEW],
      },
    ],
  },
  {
    name: 'SISTEMA',
    order: 3,
    sections: [
      {
        name: 'Usuarios',
        order: 1,
        route: '/users',
        permissions: [PermissionCode.SYSTEM_ADMIN],
      },
      {
        name: 'Roles',
        order: 2,
        route: '/roles',
        permissions: [PermissionCode.SYSTEM_ADMIN],
      },
      {
        name: 'Configuración',
        order: 3,
        route: '/config',
        permissions: [PermissionCode.SYSTEM_ADMIN],
      },
    ],
  },
];

const PERMISSION_META: Record<PermissionCode, { description: string }> = {
  [PermissionCode.DASHBOARD_VIEW]: { description: 'Ver dashboard' },
  [PermissionCode.SYSTEM_ADMIN]: { description: 'Administración del sistema' },
  [PermissionCode.LIVE_MANAGE]: { description: 'Gestionar transmisiones' },
  [PermissionCode.LIVE_VIEW]: { description: 'Ver transmisiones' },
  [PermissionCode.ROUND_MANAGE]: { description: 'Gestionar rondas' },
  [PermissionCode.ROUND_VIEW]: { description: 'Ver rondas' },
  [PermissionCode.PROMO_MANAGE]: { description: 'Gestionar promociones' },
  [PermissionCode.PURCHASE_CREATE]: { description: 'Comprar casillas' },
  [PermissionCode.PURCHASE_CANCEL]: { description: 'Cancelar compras' },
  [PermissionCode.WALLET_VIEW_OWN]: { description: 'Ver mochila propia' },
  [PermissionCode.WALLET_VIEW_ALL]: { description: 'Ver todas las mochilas' },
  [PermissionCode.WALLET_PAYMENT]: { description: 'Registrar pagos' },
  [PermissionCode.WALLET_ADJUST]: { description: 'Ajustar mochila' },
  [PermissionCode.POINTS_REDEEM]: { description: 'Canjear puntos' },
  [PermissionCode.POINTS_ADJUST]: { description: 'Ajustar puntos' },
  [PermissionCode.HISTORY_VIEW]: { description: 'Ver historial' },
  [PermissionCode.HISTORY_EXPORT]: { description: 'Exportar historial' },
  [PermissionCode.GAME_CONFIG]: { description: 'Configurar juego' },
  [PermissionCode.AUDIT_VIEW]: { description: 'Ver auditoría' },
};

function primarySectionFor(code: PermissionCode): {
  menu: string;
  section: string;
} | null {
  for (const menu of NAV_CATALOG) {
    for (const section of menu.sections) {
      if (section.permissions.includes(code)) {
        return { menu: menu.name, section: section.name };
      }
    }
  }
  return null;
}

export async function ensurePermissionCatalog(manager: EntityManager) {
  const sectionByKey = new Map<string, Section>();

  for (const menuDef of NAV_CATALOG) {
    let menu = await manager.findOne(Menu, { where: { name: menuDef.name } });
    if (!menu) {
      menu = await manager.save(
        manager.create(Menu, {
          name: menuDef.name,
          sortOrder: menuDef.order,
        }),
      );
    } else if (menu.sortOrder !== menuDef.order) {
      menu.sortOrder = menuDef.order;
      menu = await manager.save(menu);
    }

    for (const sectionDef of menuDef.sections) {
      const key = `${menuDef.name}::${sectionDef.name}`;
      let section = await manager.findOne(Section, {
        where: { name: sectionDef.name, menuId: menu.id },
      });
      if (!section) {
        section = await manager.save(
          manager.create(Section, {
            name: sectionDef.name,
            menuId: menu.id,
            sortOrder: sectionDef.order,
          }),
        );
      } else if (section.sortOrder !== sectionDef.order) {
        section.sortOrder = sectionDef.order;
        section = await manager.save(section);
      }
      sectionByKey.set(key, section);
    }
  }

  for (const code of Object.values(PermissionCode)) {
    const meta = PERMISSION_META[code];
    const primary = primarySectionFor(code);
    const sectionId = primary
      ? sectionByKey.get(`${primary.menu}::${primary.section}`)?.id
      : undefined;

    let permission = await manager.findOne(Permission, { where: { code } });
    if (!permission) {
      permission = manager.create(Permission, {
        code,
        description: meta.description,
        sectionId: sectionId ?? null,
      });
      await manager.save(permission);
    } else {
      let dirty = false;
      if (permission.description !== meta.description) {
        permission.description = meta.description;
        dirty = true;
      }
      if (sectionId && permission.sectionId !== sectionId) {
        permission.sectionId = sectionId;
        dirty = true;
      }
      if (dirty) await manager.save(permission);
    }
  }
}

export type BuiltMenuNode = {
  id: string;
  name: string;
  sortOrder: number;
  sections: {
    id: string;
    name: string;
    sortOrder: number;
    route?: string;
    permissions: { id: string; code: string; description: string }[];
  }[];
};

export function buildNavMenusFromPermissions(
  userPermissions: Permission[],
  dbMenus: Menu[],
): BuiltMenuNode[] {
  const byCode = new Map(userPermissions.map((p) => [p.code, p]));
  const codes = new Set(userPermissions.map((p) => p.code));
  const isAdmin = codes.has(PermissionCode.SYSTEM_ADMIN);

  const menuEntityByName = new Map(dbMenus.map((m) => [m.name, m]));
  const result: BuiltMenuNode[] = [];

  for (const menuDef of NAV_CATALOG) {
    const menuEntity = menuEntityByName.get(menuDef.name);
    if (!menuEntity) continue;

    const sectionEntityByName = new Map(
      (menuEntity.sections ?? []).map((s) => [s.name, s]),
    );
    const sections: BuiltMenuNode['sections'] = [];

    for (const sectionDef of menuDef.sections) {
      const allowedCodes = sectionDef.permissions.filter(
        (code) => isAdmin || codes.has(code),
      );
      if (!allowedCodes.length) continue;
      const sectionEntity = sectionEntityByName.get(sectionDef.name);
      if (!sectionEntity) continue;

      sections.push({
        id: sectionEntity.id,
        name: sectionDef.name,
        sortOrder: sectionDef.order,
        route: sectionDef.route,
        permissions: allowedCodes.map((code) => {
          const p = byCode.get(code);
          return {
            id: p?.id ?? code,
            code,
            description: p?.description ?? PERMISSION_META[code].description,
          };
        }),
      });
    }

    if (!sections.length) continue;
    result.push({
      id: menuEntity.id,
      name: menuDef.name,
      sortOrder: menuDef.order,
      sections,
    });
  }

  return result;
}
