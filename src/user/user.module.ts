import { Module } from '@nestjs/common';
import { TenantOrmModule } from 'src/tenant/tenant-orm.module';
import { AuthModule } from 'src/auth/auth.module';
import { User } from './entities/user.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { Role } from 'src/role/entities/role.entity';
import { Wallet } from 'src/wallet/entities/wallet.entity';
import { PointsWallet } from 'src/points/entities/points-wallet.entity';

@Module({
  imports: [
    TenantOrmModule.forFeature([User, Role, Wallet, PointsWallet]),
    AuthModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
