import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCREENS_KEY } from '../decorators/permissions.decorator.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScreens = this.reflector.getAllAndOverride<string[]>(
      SCREENS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredScreens || requiredScreens.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    // Super Admin and Admin bypass screen-level restrictions
    if (user.role === 'super_admin' || user.role === 'admin') {
      return true;
    }

    const userScreens: string[] = user.allowedScreens || [];

    if (userScreens.includes('ALL')) {
      return true;
    }

    const hasPermission = requiredScreens.some((screen) =>
      userScreens.includes(screen),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied. You do not have permission for the screen: [${requiredScreens.join(', ')}]`,
      );
    }

    return true;
  }
}
