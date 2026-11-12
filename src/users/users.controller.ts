import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ListUsersQuery } from './dto/list-users.query';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PublicUser, UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** O'qituvchi paneli: o'quvchilar ro'yxati */
  @Roles('ADMIN')
  @Get()
  list(@Query() q: ListUsersQuery) {
    return this.users.list(q);
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<PublicUser> {
    return this.users.toPublic(await this.users.getById(user.id));
  }

  @Patch('me')
  async updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto): Promise<PublicUser> {
    return this.users.toPublic(await this.users.updateProfile(user.id, dto));
  }
}
