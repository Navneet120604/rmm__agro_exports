import { Injectable, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import { documentCounters } from '../../database/schema/document-counters.js';

export type DocumentType =
  | 'PROFORMA'
  | 'PRODUCTION_ORDER'
  | 'COMMERCIAL_INVOICE';

export interface NextNumberResult {
  documentNumber: string;
  sequenceNumber: number;
  financialYear: string;
  prefix: string;
}

export function computeFinancialYear(date: Date = new Date()): string {
  // Standardize on Asia/Kolkata (Indian Standard Time) for Indian tax & customs compliance
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
  });
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find((p) => p.type === 'year')!.value, 10);
  const month = parseInt(parts.find((p) => p.type === 'month')!.value, 10); // 1 to 12

  // April (4) through December (12) starts the new FY; January (1) through March (3) is part of previous year
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  const startShort = String(startYear).slice(-2);
  const endShort = String(endYear).slice(-2);
  return `${startShort}-${endShort}`; // e.g. "26-27"
}

export function formatDocumentNumber(
  companyCode: string,
  docType: DocumentType,
  sequence: number,
  financialYear: string,
): string {
  const code = companyCode.trim().toUpperCase();
  switch (docType) {
    case 'PROFORMA':
      return `PI-${code}/AM/${sequence}`;
    case 'PRODUCTION_ORDER':
      return `${code}/${sequence}`;
    case 'COMMERCIAL_INVOICE':
      return `${code}/EX/${financialYear}/${sequence}`;
    default: {
      const unsupported: never = docType;
      throw new Error(`Unsupported document type: ${String(unsupported)}`);
    }
  }
}

@Injectable()
export class DocumentNumberingService {
  private readonly logger = new Logger(DocumentNumberingService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Predicts the next document number without consuming or locking the sequence.
   * Useful for showing the pre-filled default number in the UI form.
   */
  async peekNextNumber(
    companyId: string,
    companyCode: string,
    docType: DocumentType,
    date: Date = new Date(),
  ): Promise<NextNumberResult> {
    const fy =
      docType === 'COMMERCIAL_INVOICE' ? computeFinancialYear(date) : 'PERPETUAL';

    if (!this.databaseService.isConnected) {
      // In-memory prediction for offline/mock environments
      const nextSeq = 1;
      return {
        documentNumber: formatDocumentNumber(companyCode, docType, nextSeq, fy),
        sequenceNumber: nextSeq,
        financialYear: fy,
        prefix: companyCode.toUpperCase(),
      };
    }

    const db = this.databaseService.db;
    const existing = await db
      .select()
      .from(documentCounters)
      .where(
        and(
          eq(documentCounters.companyId, companyId),
          eq(documentCounters.documentType, docType),
          eq(documentCounters.financialYear, fy),
        ),
      )
      .limit(1);

    const nextSeq = (existing[0]?.lastNumber ?? 0) + 1;

    return {
      documentNumber: formatDocumentNumber(companyCode, docType, nextSeq, fy),
      sequenceNumber: nextSeq,
      financialYear: fy,
      prefix: companyCode.toUpperCase(),
    };
  }

  /**
   * Atomically acquires and increments the document counter using PostgreSQL row locking (FOR UPDATE).
   * Guarantees zero sequence gaps and zero collisions under concurrent saves.
   */
  async allocateNextNumber(
    companyId: string,
    companyCode: string,
    docType: DocumentType,
    date: Date = new Date(),
  ): Promise<NextNumberResult> {
    const fy =
      docType === 'COMMERCIAL_INVOICE' ? computeFinancialYear(date) : 'PERPETUAL';

    if (!this.databaseService.isConnected) {
      const nextSeq = 1;
      return {
        documentNumber: formatDocumentNumber(companyCode, docType, nextSeq, fy),
        sequenceNumber: nextSeq,
        financialYear: fy,
        prefix: companyCode.toUpperCase(),
      };
    }

    const db = this.databaseService.db;

    // Run within a transaction with row lock
    const allocated = await db.transaction(async (tx) => {
      // Ensure counter row exists (Upsert / ON CONFLICT DO NOTHING)
      await tx
        .insert(documentCounters)
        .values({
          companyId,
          documentType: docType,
          financialYear: fy,
          lastNumber: 0,
          prefix: companyCode.toUpperCase(),
        })
        .onConflictDoNothing();

      // Acquire exclusive row lock
      const rows = await tx
        .select()
        .from(documentCounters)
        .where(
          and(
            eq(documentCounters.companyId, companyId),
            eq(documentCounters.documentType, docType),
            eq(documentCounters.financialYear, fy),
          ),
        )
        .for('update');

      const currentNumber = rows[0]?.lastNumber ?? 0;
      const nextNumber = currentNumber + 1;

      // Update counter
      await tx
        .update(documentCounters)
        .set({
          lastNumber: nextNumber,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(documentCounters.companyId, companyId),
            eq(documentCounters.documentType, docType),
            eq(documentCounters.financialYear, fy),
          ),
        );

      return {
        sequenceNumber: nextNumber,
        documentNumber: formatDocumentNumber(
          companyCode,
          docType,
          nextNumber,
          fy,
        ),
        financialYear: fy,
        prefix: companyCode.toUpperCase(),
      };
    });

    return allocated;
  }
}
