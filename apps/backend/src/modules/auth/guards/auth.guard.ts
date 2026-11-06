import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService, SESSION_COOKIE_NAME } from '../auth.service.js';

export const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException('Authentication credentials missing');
    }

    try {
      const payload = await this.authService.verifySessionToken(token);
      // Attach to request for downstream controllers and guards
      (request as any).user = payload;
      (request as any).activeCompanyId = payload.activeCompanyId;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }

  private extractTokenFromRequest(request: Request): string | null {
    // 1. Check HttpOnly cookie
    if (request.cookies && request.cookies[SESSION_COOKIE_NAME]) {
      return request.cookies[SESSION_COOKIE_NAME];
    }

    // 2. Fall back to Authorization: Bearer <token>
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}
