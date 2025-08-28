import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '../enum';

@Injectable()
export class SelfGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (req.user?.role || req.user?.role === Role.SUPERADMIN) {
      return true;
    }
    if (req.params.id !== req.user.id) {
      throw new ForbiddenException('Forbidden user');
    }
    return true;
  }
}
