import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import type { Response } from 'express';
import { SignJWT, jwtVerify } from 'jose';
import { DatabaseService } from '../../database/database.service.js';
import { users } from '../../database/schema/users.js';
import { ActivityLogService } from '../activity-log/activity-log.service.js';
import { CompaniesService } from '../companies/companies.service.js';

export interface UserSessionPayload {
  sub: string; // user id
  username: string;
  role: string;
  allowedScreens: string[];
  activeCompanyId: string;
  activeCompanyCode: string;
}

export const SESSION_COOKIE_NAME = 'exportfly_session';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: Uint8Array;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly companiesService: CompaniesService,
    private readonly activityLogService: ActivityLogService,
  ) {
    const secret =
      process.env.JWT_SECRET ||
      'exportfly-enterprise-jwt-super-secret-development-key-2026';
    this.jwtSecret = new TextEncoder().encode(secret);
  }

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });
  }

  async verifyPassword(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  async createSessionToken(payload: UserSessionPayload): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(process.env.JWT_EXPIRES_IN || '8h')
      .sign(this.jwtSecret);
  }

  async verifySessionToken(token: string): Promise<UserSessionPayload> {
    try {
      const { payload } = await jwtVerify(token, this.jwtSecret);
      return payload as unknown as UserSessionPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired session token');
    }
  }

  setSessionCookie(res: Response, token: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });
  }

  clearSessionCookie(res: Response): void {
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      path: '/',
    });
  }

  async login(
    usernameInput: string,
    passwordInput: string,
    res: Response,
    requestedCompanyId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    let userRecord = null;

    if (this.databaseService.isConnected) {
      const rows = await this.databaseService.db
        .select()
        .from(users)
        .where(eq(users.username, usernameInput))
        .limit(1);

      userRecord = rows[0] || null;
    } else {
      // Offline fallback user for local setup/testing
      if (usernameInput === 'admin' && passwordInput === 'Admin@123') {
        userRecord = {
          id: '00000000-0000-0000-0000-000000000001',
          username: 'admin',
          email: 'admin@rmmagro.com',
          fullName: 'System Administrator',
          role: 'admin',
          allowedScreens: ['ALL'],
          isActive: true,
          passwordHash: await this.hashPassword('Admin@123'),
          lastLoginAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    }

    if (!userRecord || !userRecord.isActive) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const isValidPassword = await this.verifyPassword(
      userRecord.passwordHash,
      passwordInput,
    );

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // Determine authorized sister companies
    const userCompaniesList = await this.companiesService.getCompaniesForUser(
      userRecord.id,
      userRecord.role,
    );

    if (userCompaniesList.length === 0) {
      throw new BadRequestException(
        'User is not assigned to any exporting sister companies',
      );
    }

    // Select active company
    const selectedCompany = requestedCompanyId
      ? userCompaniesList.find((c) => c.id === requestedCompanyId)
      : userCompaniesList[0];

    if (!selectedCompany) {
      throw new BadRequestException(
        'User is not authorized for the requested company',
      );
    }

    const sessionPayload: UserSessionPayload = {
      sub: userRecord.id,
      username: userRecord.username,
      role: userRecord.role,
      allowedScreens: userRecord.allowedScreens,
      activeCompanyId: selectedCompany.id,
      activeCompanyCode: selectedCompany.code,
    };

    const token = await this.createSessionToken(sessionPayload);
    this.setSessionCookie(res, token);

    // Audit login event
    await this.activityLogService.record({
      companyId: selectedCompany.id,
      userId: userRecord.id,
      username: userRecord.username,
      action: 'LOGIN',
      entityTable: 'users',
      entityId: userRecord.id,
      ipAddress,
      userAgent,
    });

    return {
      user: {
        id: userRecord.id,
        username: userRecord.username,
        fullName: userRecord.fullName,
        email: userRecord.email,
        role: userRecord.role,
        allowedScreens: userRecord.allowedScreens,
      },
      activeCompany: selectedCompany,
      companies: userCompaniesList,
      token,
    };
  }

  async switchCompany(
    currentUser: UserSessionPayload,
    targetCompanyId: string,
    res: Response,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const userCompaniesList = await this.companiesService.getCompaniesForUser(
      currentUser.sub,
      currentUser.role,
    );

    const targetCompany = userCompaniesList.find(
      (c) => c.id === targetCompanyId,
    );

    if (!targetCompany) {
      throw new BadRequestException(
        'User is not authorized to switch to this company',
      );
    }

    const previousCompanyId = currentUser.activeCompanyId;

    const updatedPayload: UserSessionPayload = {
      ...currentUser,
      activeCompanyId: targetCompany.id,
      activeCompanyCode: targetCompany.code,
    };

    const token = await this.createSessionToken(updatedPayload);
    this.setSessionCookie(res, token);

    // Audit company switch event
    await this.activityLogService.record({
      companyId: targetCompany.id,
      userId: currentUser.sub,
      username: currentUser.username,
      action: 'SWITCH_COMPANY',
      entityTable: 'companies',
      entityId: targetCompany.id,
      previousValues: { activeCompanyId: previousCompanyId },
      newValues: { activeCompanyId: targetCompany.id },
      ipAddress,
      userAgent,
    });

    return {
      message: 'Active company switched successfully',
      activeCompany: targetCompany,
      token,
    };
  }

  async logout(
    currentUser: UserSessionPayload | null,
    res: Response,
    ipAddress?: string,
    userAgent?: string,
  ) {
    this.clearSessionCookie(res);

    if (currentUser) {
      await this.activityLogService.record({
        companyId: currentUser.activeCompanyId,
        userId: currentUser.sub,
        username: currentUser.username,
        action: 'LOGOUT',
        entityTable: 'users',
        entityId: currentUser.sub,
        ipAddress,
        userAgent,
      });
    }

    return { message: 'Logged out successfully' };
  }
}
