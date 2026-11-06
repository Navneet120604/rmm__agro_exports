import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DocumentNumberingService,
  computeFinancialYear,
  formatDocumentNumber,
} from './document-numbering.service.js';
import type { DatabaseService } from '../../database/database.service.js';

describe('DocumentNumberingService', () => {
  let service: DocumentNumberingService;
  let mockDatabaseService: DatabaseService;

  beforeEach(() => {
    mockDatabaseService = {
      isConnected: false,
      db: null as any,
      onModuleInit: vi.fn(),
      onModuleDestroy: vi.fn(),
    } as unknown as DatabaseService;

    service = new DocumentNumberingService(mockDatabaseService);
  });

  describe('computeFinancialYear', () => {
    it('should return 26-27 for November 2026 (mid FY)', () => {
      const date = new Date('2026-11-06T00:00:00Z');
      expect(computeFinancialYear(date)).toBe('26-27');
    });

    it('should return 26-27 for April 1, 2026 (start of FY)', () => {
      const date = new Date('2026-04-01T00:00:00Z');
      expect(computeFinancialYear(date)).toBe('26-27');
    });

    it('should return 25-26 for March 31, 2026 (end of prior FY in IST)', () => {
      const date = new Date('2026-03-31T12:00:00Z');
      expect(computeFinancialYear(date)).toBe('25-26');
    });

    it('should return 25-26 for January 15, 2026 (Q4 of FY 2025-26)', () => {
      const date = new Date('2026-01-15T00:00:00Z');
      expect(computeFinancialYear(date)).toBe('25-26');
    });
  });

  describe('peekNextNumber', () => {
    it('should predict next number without advancing sequence when offline', async () => {
      const result = await service.peekNextNumber(
        'co-1',
        'RMM',
        'PROFORMA',
        new Date('2026-11-06'),
      );
      expect(result.documentNumber).toBe('PI-RMM/AM/1');
      expect(result.sequenceNumber).toBe(1);
    });
  });

  describe('formatDocumentNumber', () => {
    it('should format Proforma Invoice as PI-<CODE>/AM/<no>', () => {
      const formatted = formatDocumentNumber('RMM', 'PROFORMA', 101, 'PERPETUAL');
      expect(formatted).toBe('PI-RMM/AM/101');
    });

    it('should format Production Order as <CODE>/<no>', () => {
      const formatted = formatDocumentNumber(
        'PRAGATI',
        'PRODUCTION_ORDER',
        52,
        'PERPETUAL',
      );
      expect(formatted).toBe('PRAGATI/52');
    });

    it('should format Commercial Invoice as <CODE>/EX/<FY>/<no>', () => {
      const formatted = formatDocumentNumber(
        'DUDANI',
        'COMMERCIAL_INVOICE',
        1,
        '26-27',
      );
      expect(formatted).toBe('DUDANI/EX/26-27/1');
    });

    it('should normalize lowercase company code to uppercase', () => {
      const formatted = formatDocumentNumber('rmm', 'PRODUCTION_ORDER', 7, '26-27');
      expect(formatted).toBe('RMM/7');
    });
  });

  describe('Concurrency Simulation (Gap-free & Collision-free)', () => {
    it('should allocate contiguous gap-free sequence numbers without duplicates under simulated concurrent requests', async () => {
      // In-memory counter state with transactional mutex
      let currentCounter = 0;
      let mutex = Promise.resolve();

      const mockDb = {
        transaction: vi.fn(async (cb) => {
          // Serialize concurrent executions exactly as PostgreSQL row locks (FOR UPDATE) do
          const release = mutex;
          let resolveNext: () => void;
          mutex = new Promise((resolve) => {
            resolveNext = resolve;
          });

          await release;
          try {
            const tx = {
              insert: () => ({ values: () => ({ onConflictDoNothing: vi.fn() }) }),
              select: () => ({
                from: () => ({
                  where: () => ({
                    for: vi.fn().mockResolvedValue([{ lastNumber: currentCounter }]),
                  }),
                }),
              }),
              update: () => ({
                set: (vals: { lastNumber: number }) => {
                  currentCounter = vals.lastNumber;
                  return { where: vi.fn().mockResolvedValue(true) };
                },
              }),
            };
            return await cb(tx);
          } finally {
            resolveNext!();
          }
        }),
      };

      const concurrentService = new DocumentNumberingService({
        isConnected: true,
        db: mockDb as any,
      } as any);

      // Launch 50 concurrent requests simultaneously
      const requestCount = 50;
      const promises = Array.from({ length: requestCount }, () =>
        concurrentService.allocateNextNumber(
          'test-company-uuid',
          'RMM',
          'COMMERCIAL_INVOICE',
          new Date('2026-11-06'),
        ),
      );

      const results = await Promise.all(promises);

      // Verify exactly 50 numbers were allocated
      expect(results).toHaveLength(requestCount);

      // Verify sequence numbers are exactly 1 to 50
      const sequences = results.map((r) => r.sequenceNumber).sort((a, b) => a - b);
      expect(sequences[0]).toBe(1);
      expect(sequences[sequences.length - 1]).toBe(50);

      // Verify no gaps
      for (let i = 0; i < requestCount; i++) {
        expect(sequences[i]).toBe(i + 1);
      }

      // Verify no duplicate document numbers
      const docNumbers = results.map((r) => r.documentNumber);
      const uniqueDocNumbers = new Set(docNumbers);
      expect(uniqueDocNumbers.size).toBe(requestCount);

      // Verify document format
      expect(docNumbers[0]).toMatch(/^RMM\/EX\/26-27\/\d+$/);
    });
  });
});
