import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/permissions.decorator';
import { CurrentUser } from 'src/common/decorators/auth.decorators';
import { AuthService } from './auth.service';
import { BootstrapDto, LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('bootstrap')
  bootstrap(@Body() dto: BootstrapDto) {
    return this.authService.bootstrap(dto);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.authService.me(user.id, user.tenantId);
  }

  @ApiBearerAuth()
  @Post('refresh')
  refresh(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.authService.refresh(user.id, user.tenantId);
  }
}
