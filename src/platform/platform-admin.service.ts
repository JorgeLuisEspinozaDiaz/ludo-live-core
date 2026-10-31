import {
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { EntityStatus } from 'src/common/enums';
import { PlatformAdmin } from './entities/platform-admin.entity';
import { PlatformLoginDto } from './dto/platform.dto';

export const PLATFORM_PERMISSION = 'platform.admin';

@Injectable()
export class PlatformAdminService implements OnModuleInit {
  constructor(
    @InjectRepository(PlatformAdmin, 'control')
    private readonly admins: Repository<PlatformAdmin>,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  async onModuleInit() {
    await this.ensureSeedAdmin();
  }

  private async ensureSeedAdmin() {
    const username =
      this.config.get<string>('PLATFORM_ADMIN_USERNAME') || 'platform';
    const password =
      this.config.get<string>('PLATFORM_ADMIN_PASSWORD') || 'platform-admin';
    const existing = await this.admins.findOne({ where: { username } });
    if (existing) return;

    const hashed = await bcrypt.hash(password, 10);
    await this.admins.save(
      this.admins.create({
        username,
        email: this.config.get<string>('PLATFORM_ADMIN_EMAIL') || null,
        password: hashed,
        status: EntityStatus.ACTIVE,
      }),
    );
  }

  async login(dto: PlatformLoginDto) {
    const admin = await this.admins.findOne({
      where: { username: dto.username },
    });
    if (!admin || admin.status !== EntityStatus.ACTIVE) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const ok = await bcrypt.compare(dto.password, admin.password);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    const access_token = this.jwt.sign({
      typ: 'platform',
      sub: admin.id,
      username: admin.username,
    });

    return {
      access_token,
      user: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        tenantId: null,
        tenantSlug: null,
        role: { id: 'platform', name: 'Administrador total' },
        isPlatformAdmin: true,
      },
      permissions: [PLATFORM_PERMISSION],
      menus: [
        {
          id: 'platform-menu',
          name: 'PLATAFORMA',
          sortOrder: 1,
          sections: [
            {
              id: 'platform-tenants',
              name: 'Tenants',
              sortOrder: 1,
              route: '/platform/tenants',
              permissions: [
                {
                  code: PLATFORM_PERMISSION,
                  description: 'Gestionar tenants',
                },
              ],
            },
          ],
        },
      ],
    };
  }

  async findById(id: string) {
    return this.admins.findOne({ where: { id } });
  }
}
