import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { validate as isUUID } from 'uuid';

@Injectable()
export class UUIDInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> | Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    if (
      request.params &&
      'id' in request.params &&
      request.route.path.includes(':id')
    ) {
      if (!isUUID(request.params.id)) {
        throw new BadRequestException('Invalid UUID format for id');
      }
    }
    return next.handle();
  }
}
