import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthUser, REFRESH_COOKIE } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AppConfig } from '../config/app-config.service';
import { PublicUser, UsersService } from '../users/users.service';
import { clearAuthCookies, setAuthCookies } from './cookies';
import { DevLoginDto, PollLoginDto } from './dto/auth.dto';
import { LoginService, StartedLogin } from './login.service';
import { SessionMeta, TokenService } from './token.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly login: LoginService,
    private readonly tokens: TokenService,
    private readonly users: UsersService,
    private readonly config: AppConfig,
  ) {}

  /** 1-qadam: brauzer kirish so'rovini ochadi va Telegram deep link oladi */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('telegram/start')
  @HttpCode(200)
  start(): Promise<StartedLogin> {
    return this.login.start();
  }

  /** 2-qadam: brauzer har 2 soniyada so'raydi; bot tasdiqlagach cookie'lar o'rnatiladi */
  @Public()
  @Throttle({ default: { limit: 90, ttl: 60_000 } })
  @Post('telegram/poll')
  @HttpCode(200)
  async poll(
    @Body() dto: PollLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ status: 'pending' | 'expired' } | { status: 'confirmed'; user: PublicUser }> {
    const result = await this.login.poll(dto.requestId, dto.pollSecret);
    if (result.status !== 'confirmed') return result;
    const issued = await this.tokens.issue(result.user, meta(req));
    setAuthCookies(res, this.config, issued);
    return { status: 'confirmed', user: this.users.toPublic(result.user) };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: PublicUser; accessExpiresAt: Date }> {
    const cookies = req.cookies as Record<string, string> | undefined;
    try {
      const issued = await this.tokens.rotate(cookies?.[REFRESH_COOKIE]);
      setAuthCookies(res, this.config, issued);
      return { user: this.users.toPublic(issued.user), accessExpiresAt: issued.accessExpiresAt };
    } catch (err) {
      clearAuthCookies(res, this.config);
      throw err;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const cookies = req.cookies as Record<string, string> | undefined;
    await this.tokens.revoke(cookies?.[REFRESH_COOKIE]);
    clearAuthCookies(res, this.config);
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<PublicUser> {
    return this.users.toPublic(await this.users.getById(user.id));
  }

  /**
   * Faqat lokal ishlab chiqish: botsiz kirish.
   * AUTH_DEV_LOGIN=true va NODE_ENV≠production bo'lmasa — 404.
   */
  @Public()
  @Post('dev-login')
  @HttpCode(200)
  async devLogin(
    @Body() dto: DevLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: PublicUser }> {
    if (!this.config.get('AUTH_DEV_LOGIN') || this.config.isProd) throw new NotFoundException();
    const user = await this.users.upsertDevUser(
      dto.phone,
      dto.firstName ?? 'Test',
      dto.role ?? 'STUDENT',
    );
    setAuthCookies(res, this.config, await this.tokens.issue(user, meta(req)));
    return { user: this.users.toPublic(user) };
  }
}

function meta(req: Request): SessionMeta {
  return { userAgent: req.headers['user-agent'], ip: req.ip };
}
