import { EntityManager } from 'typeorm';
import { Menu } from 'src/menu/entities/menu.entity';
import { Section } from 'src/section/entities/section.entity';
import { Permission } from 'src/permission/entities/permission.entity';
import { PermissionCode } from 'src/common/enums';

/**
 * Estructura del sidebar:
 * - menu  = grupo / sectionName del UI
 * - sections = ítems de navegación
 * - permissions = códigos requeridos para mostrar el ítem
 */
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
    name: 'SISTEMA',
    order: 2,
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
};

/** Primera sección del NAV que usa cada permiso (para FK section_id). */
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
  const menuByName = new Map<string, Menu>();
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
    menuByName.set(menuDef.name, menu);

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

/**
 * Arma el sidebar: cruza NAV_CATALOG + menús/secciones de BD + permisos del usuario.
 * system.admin ve todos los ítems.
 */
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
