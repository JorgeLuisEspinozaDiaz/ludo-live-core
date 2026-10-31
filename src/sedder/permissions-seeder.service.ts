import { Injectable } from '@nestjs/common';
import { Reflector, MetadataScanner } from '@nestjs/core';
import { Permission } from 'src/permission/entities/permission.entity';
import { EntityManager, Repository } from 'typeorm';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { Section } from 'src/section/entities/section.entity';
import { Menu } from 'src/menu/entities/menu.entity';
import {
  SECTION_KEY,
  SectionInterceptor,
} from 'src/common/decorators/section.decorator';

type ControllerSeed = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controller: any;
  /** Ítem de navegación */
  sectionName: string;
  /** Grupo del sidebar */
  menuName: string;
  menuOrder: number;
  sectionOrder: number;
};

/**
 * Registra menús/secciones del sidebar y permisos por endpoint
 * escaneando controllers.
 */
@Injectable()
export class PermissionsSeederService {
  private permissionRepository!: Repository<Permission>;
  private menuRepository!: Repository<Menu>;
  private sectionRepository!: Repository<Section>;

  constructor(
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly sectionInterceptor: SectionInterceptor,
  ) {}

  /** Siembra menús/secciones/permisos de endpoints en la BD del tenant. */
  async seedIntoManager(manager: EntityManager) {
    this.permissionRepository = manager.getRepository(Permission);
    this.menuRepository = manager.getRepository(Menu);
    this.sectionRepository = manager.getRepository(Section);
    this.sectionInterceptor.bindRepositories(
      this.sectionRepository,
      this.menuRepository,
    );
    await this.seed();
  }

  private async seed() {
    const controllers: ControllerSeed[] = [
      {
        controller: require('../live/live.controller').LiveController,
        menuName: 'JUEGO',
        menuOrder: 2,
        sectionName: 'Transmisiones',
        sectionOrder: 1,
      },
      {
        controller: require('../round/round.controller').RoundController,
        menuName: 'JUEGO',
        menuOrder: 2,
        sectionName: 'Rondas',
        sectionOrder: 2,
      },
      {
        controller: require('../wallet/wallet.controller').WalletController,
        menuName: 'JUEGO',
        menuOrder: 2,
        sectionName: 'Mochilas',
        sectionOrder: 3,
      },
      {
        controller: require('../points/points.controller').PointsController,
        menuName: 'JUEGO',
        menuOrder: 2,
        sectionName: 'Mochilas',
        sectionOrder: 3,
      },
      {
        controller: require('../history/history.controller').HistoryController,
        menuName: 'JUEGO',
        menuOrder: 2,
        sectionName: 'Historial',
        sectionOrder: 5,
      },
      {
        controller: require('../game-config/game-config.controller')
          .GameConfigController,
        menuName: 'JUEGO',
        menuOrder: 2,
        sectionName: 'Configuración del juego',
        sectionOrder: 6,
      },
      {
        controller: require('../audit/audit.controller').AuditController,
        menuName: 'JUEGO',
        menuOrder: 2,
        sectionName: 'Auditoría',
        sectionOrder: 7,
      },
      {
        controller: require('../purchase/purchase.controller')
          .PurchaseController,
        menuName: 'JUEGO',
        menuOrder: 2,
        sectionName: 'Rondas',
        sectionOrder: 2,
      },
      {
        controller: require('../user/user.controller').UserController,
        menuName: 'SISTEMA',
        menuOrder: 3,
        sectionName: 'Usuarios',
        sectionOrder: 1,
      },
      {
        controller: require('../role/role.controller').RoleController,
        menuName: 'SISTEMA',
        menuOrder: 3,
        sectionName: 'Roles',
        sectionOrder: 2,
      },
      {
        controller: require('../tenant/tenant.controller').TenantController,
        menuName: 'SISTEMA',
        menuOrder: 3,
        sectionName: 'Configuración',
        sectionOrder: 3,
      },
      {
        controller: require('../permission/permission.controller')
          .PermissionController,
        menuName: 'SISTEMA',
        menuOrder: 3,
        sectionName: 'Roles',
        sectionOrder: 2,
      },
      {
        controller: require('../menu/menu.controller').MenuController,
        menuName: 'SISTEMA',
        menuOrder: 3,
        sectionName: 'Configuración',
        sectionOrder: 3,
      },
      {
        controller: require('../section/section.controller').SectionController,
        menuName: 'SISTEMA',
        menuOrder: 3,
        sectionName: 'Configuración',
        sectionOrder: 3,
      },
    ];

    const ensureExtra = [
      {
        menuName: 'PRINCIPAL',
        menuOrder: 1,
        sectionName: 'Dashboard',
        sectionOrder: 1,
      },
    ];
    for (const extra of ensureExtra) {
      const menu = await this.findOrCreateMenu(extra.menuName, extra.menuOrder);
      await this.ensureSectionOrdered(
        extra.sectionName,
        menu,
        extra.sectionOrder,
      );
    }

    for (const entry of controllers) {
      const menu = await this.findOrCreateMenu(entry.menuName, entry.menuOrder);
      await this.ensureSectionOrdered(
        entry.sectionName,
        menu,
        entry.sectionOrder,
      );
    }

    const scannedControllers = new Set<Function>();
    this.registeredCodes.clear();

    for (const {
      controller,
      sectionName,
      menuName,
      menuOrder,
      sectionOrder,
    } of controllers) {
      if (scannedControllers.has(controller)) continue;
      scannedControllers.add(controller);

      const instance = Object.create(controller.prototype);
      const prototype = controller.prototype;

      const menu = await this.findOrCreateMenu(menuName, menuOrder);
      const section = await this.ensureSectionOrdered(
        sectionName,
        menu,
        sectionOrder,
      );
      if (!section) {
        console.error(`No se pudo obtener la sección: ${sectionName}`);
        continue;
      }

      const methodNames: string[] = [];
      this.metadataScanner.scanFromPrototype(
        instance,
        prototype,
        (methodName) => methodNames.push(methodName),
      );

      for (const methodName of methodNames) {
        const decoratorSectionName = this.reflector.get<string>(
          SECTION_KEY,
          prototype[methodName],
        );
        const finalSectionName = decoratorSectionName || sectionName;
        await this.registerRoute(
          instance,
          prototype,
          methodName,
          finalSectionName,
          section,
          menuOrder,
          sectionOrder,
        );
      }
    }

    console.log('PermissionsSeeder: menús/secciones/endpoints verificados.');
  }

  private readonly registeredCodes = new Set<string>();

  private httpMethodMap: Record<number, string> = {
    0: 'GET',
    1: 'POST',
    2: 'PUT',
    3: 'DELETE',
    4: 'PATCH',
    5: 'OPTIONS',
    6: 'HEAD',
    7: 'ALL',
  };

  private async registerRoute(
    instance: object,
    prototype: object,
    methodName: string,
    sectionName: string,
    defaultSection: Section,
    menuOrder: number,
    sectionOrder: number,
  ) {
    const targetCallback = prototype[methodName];
    if (typeof targetCallback !== 'function') return;

    const methodValue = this.reflector.get<number>(
      METHOD_METADATA,
      targetCallback,
    );
    const path = this.reflector.get<string>(PATH_METADATA, targetCallback);
    const method = this.httpMethodMap[methodValue];

    if (!method || path === undefined || path === null) return;

    const controllerPath = this.getControllerPath(
      (instance as { constructor: Function }).constructor,
    );
    const fullPath = this.replaceDynamicParams(
      this.joinPaths(controllerPath, path),
    );
    const sanitizedPath = this.sanitizePath(fullPath);
    const description = this.generateDescription(method, sanitizedPath);

    let section = defaultSection;
    const menu = await this.findOrCreateMenu(
      defaultSection.menu?.name ?? 'SISTEMA',
      menuOrder,
    );
    const resolved = await this.ensureSectionOrdered(
      sectionName,
      menu,
      sectionOrder,
    );
    if (resolved) section = resolved;

    if (!section) {
      console.error(`No se pudo obtener la sección: ${sectionName}`);
      return;
    }

    await this.registerPermission(method, sanitizedPath, description, section);
  }

  private async findOrCreateMenu(
    menuName: string,
    sortOrder = 0,
  ): Promise<Menu> {
    let menu = await this.menuRepository.findOne({ where: { name: menuName } });
    if (!menu) {
      menu = this.menuRepository.create({ name: menuName, sortOrder });
      menu = await this.menuRepository.save(menu);
      console.log(`Menú creado: ${menuName}`);
    } else if (menu.sortOrder !== sortOrder) {
      menu.sortOrder = sortOrder;
      menu = await this.menuRepository.save(menu);
    }
    return menu;
  }

  private async ensureSectionOrdered(
    sectionName: string,
    menu: Menu,
    sortOrder: number,
  ): Promise<Section | null> {
    const section = await this.sectionInterceptor.ensureSection(
      sectionName,
      menu.id,
    );
    if (!section) return null;

    if (!section.menu) {
      section.menu = menu;
    }
    if (section.sortOrder !== sortOrder) {
      section.sortOrder = sortOrder;
      return this.sectionRepository.save(section);
    }
    return section;
  }

  private sanitizePath(path: string): string {
    return path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
  }

  private joinPaths(prefix: string, path: string): string {
    const p = prefix.replace(/\/$/, '');
    const s = path.startsWith('/') ? path : `/${path}`;
    if (!path || path === '/') return p || '/';
    return `${p}${s}`.replace(/\/{2,}/g, '/');
  }

  private getControllerPath(constructor: Function): string {
    const controllerPath =
      Reflect.getMetadata(PATH_METADATA, constructor) || '';
    if (!controllerPath) return '';
    return `/${controllerPath}`;
  }

  private replaceDynamicParams(path: string): string {
    return path.replace(/\/?:([^/]+)/g, '/:$1');
  }

  private generateDescription(method: string, path: string): string {
    const base = path.replace(/\/:id/g, '');
    switch (method.toUpperCase()) {
      case 'GET':
        return path.includes(':id')
          ? `Ver detalle de ${base}`
          : `Listar ${base}`;
      case 'POST':
        return `Crear nuevo en ${base}`;
      case 'PATCH':
      case 'PUT':
        return `Actualizar en ${base}`;
      case 'DELETE':
        return `Eliminar de ${base}`;
      default:
        return `Acción en ${path}`;
    }
  }

  private async registerPermission(
    method: string,
    path: string,
    description: string,
    section: Section,
  ) {
    const endpoint = `${method}:${path}`;
    const code = endpoint;

    if (this.registeredCodes.has(code)) return;
    this.registeredCodes.add(code);

    const exists = await this.permissionRepository.findOne({
      where: [{ code }, { endpoint }],
    });

    if (exists) {
      if (
        exists.sectionId !== section.id ||
        exists.description !== description ||
        exists.endpoint !== endpoint
      ) {
        exists.sectionId = section.id;
        exists.description = description;
        exists.endpoint = endpoint;
        await this.permissionRepository.save(exists);
      }
      return;
    }

    try {
      const newPermission = this.permissionRepository.create({
        code,
        endpoint,
        description,
        sectionId: section.id,
      });
      await this.permissionRepository.save(newPermission);
      console.log(
        `Permiso registrado: ${endpoint} → ${section.menu?.name ?? ''}/${section.name}`,
      );
    } catch (err: unknown) {
      const codeErr =
        (err as { driverError?: { code?: string }; code?: string })
          ?.driverError?.code ?? (err as { code?: string })?.code;
      if (codeErr === '23505') return;
      throw err;
    }
  }
}
