import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import type { DatabaseService } from '../../database/database.service.js';
import type { CompaniesService } from '../companies/companies.service.js';
import type { ActivityLogService } from '../activity-log/activity-log.service.js';

describe('AuthService', () => {
  let authService: AuthService;
  let mockDbService: DatabaseService;
  let mockCompaniesService: CompaniesService;
  let recordSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDbService = {
      isConnected: false,
      db: null as any,
    } as any;

    mockCompaniesService = {
      getCompaniesForUser: vi.fn().mockResolvedValue([
        {
          id: 'comp-rmm-uuid',
          code: 'RMM',
          name: 'RMM Agro Exports',
          legalName: 'RMM Agro Exports Pvt Ltd',
        },
        {
          id: 'comp-pragati-uuid',
          code: 'PRAGATI',
          name: 'Pragati Rice Mills',
          legalName: 'Pragati Rice Mills LLP',
        },
      ]),
    } as any;

    recordSpy = vi.fn().mockResolvedValue(undefined);
    const mockActivityLogService = {
      record: recordSpy,
    } as unknown as ActivityLogService;

    authService = new AuthService(
      mockDbService,
      mockCompaniesService,
      mockActivityLogService,
    );
  });

  describe('Password Hashing (Argon2id)', () => {
    it('should hash a plaintext password with Argon2id and verify correctly', async () => {
      const password = 'SuperSecretExportPass#2026';
      const hash = await authService.hashPassword(password);

      expect(hash).toMatch(/^\$argon2id\$/);
      expect(await authService.verifyPassword(hash, password)).toBe(true);
      expect(await authService.verifyPassword(hash, 'WrongPassword')).toBe(false);
    });
  });

  describe('Session Tokens (JWT via jose)', () => {
    it('should create and verify a signed session token containing company and role claims', async () => {
      const sessionPayload = {
        sub: 'usr-1234',
        username: 'exporter_admin',
        role: 'admin',
        allowedScreens: ['Invoices', 'Reports'],
        activeCompanyId: 'comp-rmm-uuid',
        activeCompanyCode: 'RMM',
      };

      const token = await authService.createSessionToken(sessionPayload);
      expect(typeof token).toBe('string');

      const verified = await authService.verifySessionToken(token);
      expect(verified.sub).toBe(sessionPayload.sub);
      expect(verified.username).toBe(sessionPayload.username);
      expect(verified.role).toBe(sessionPayload.role);
      expect(verified.activeCompanyId).toBe(sessionPayload.activeCompanyId);
      expect(verified.activeCompanyCode).toBe(sessionPayload.activeCompanyCode);
    });

    it('should throw UnauthorizedException on tampered token', async () => {
      await expect(
        authService.verifySessionToken('tampered.jwt.token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Login & Multi-Company Activation', () => {
    it('should authenticate valid user and activate default company', async () => {
      const mockRes = {
        cookie: vi.fn(),
      } as any;

      const result = await authService.login(
        'admin',
        'Admin@123',
        mockRes,
        undefined,
        '127.0.0.1',
        'vitest-agent',
      );

      expect(result.user.username).toBe('admin');
      expect(result.activeCompany.code).toBe('RMM');
      expect(result.companies).toHaveLength(2);
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'exportfly_session',
        expect.any(String),
        expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
      );
      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN', username: 'admin' }),
      );
    });

    it('should reject invalid password', async () => {
      const mockRes = { cookie: vi.fn() } as any;

      await expect(
        authService.login('admin', 'WrongPass!', mockRes),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should allow user to switch active company to authorized sister company', async () => {
      const mockRes = { cookie: vi.fn() } as any;

      const currentSession = {
        sub: 'usr-1234',
        username: 'admin',
        role: 'admin',
        allowedScreens: ['ALL'],
        activeCompanyId: 'comp-rmm-uuid',
        activeCompanyCode: 'RMM',
      };

      const switchResult = await authService.switchCompany(
        currentSession,
        'comp-pragati-uuid',
        mockRes,
        '127.0.0.1',
        'vitest-agent',
      );

      expect(switchResult.activeCompany.code).toBe('PRAGATI');
      expect(mockRes.cookie).toHaveBeenCalled();
      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SWITCH_COMPANY',
          newValues: { activeCompanyId: 'comp-pragati-uuid' },
        }),
      );
    });

    it('should reject company switch if user is not authorized for target company', async () => {
      const mockRes = { cookie: vi.fn() } as any;

      const currentSession = {
        sub: 'usr-1234',
        username: 'admin',
        role: 'admin',
        allowedScreens: ['ALL'],
        activeCompanyId: 'comp-rmm-uuid',
        activeCompanyCode: 'RMM',
      };

      await expect(
        authService.switchCompany(
          currentSession,
          'unauthorized-company-id',
          mockRes,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
