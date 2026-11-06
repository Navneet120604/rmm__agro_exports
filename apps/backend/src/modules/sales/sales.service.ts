import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import {
  productionOrderItems,
  productionOrders,
  proformaInvoices,
  proformaItems,
  type ProductionOrder,
  type ProformaInvoice,
} from '../../database/schema/index.js';
import { ActivityLogService } from '../activity-log/activity-log.service.js';
import {
  computeFinancialYear,
  DocumentNumberingService,
} from '../document-numbering/document-numbering.service.js';
import type {
  CreateProductionOrderDto,
  CreateProformaInvoiceDto,
} from './dto/sales.dto.js';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly numberingService: DocumentNumberingService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // -------------------------------------------------------------------------
  // PROFORMA INVOICES (Quotation to Foreign Buyer)
  // -------------------------------------------------------------------------
  async createProformaInvoice(
    companyId: string,
    companyCode: string,
    dto: CreateProformaInvoiceDto,
    userId: string,
    username: string,
  ): Promise<ProformaInvoice> {
    const docDate = new Date(dto.documentDate);
    const fy = computeFinancialYear(docDate);

    // 1. Transactional number allocation
    const numbering = await this.numberingService.allocateNextNumber(
      companyId,
      companyCode,
      'PROFORMA',
      docDate,
    );

    // 2. Compute authoritative line and document totals
    let totalQtyMt = 0;
    let totalAmt = 0;

    const lineCalculations = dto.items.map((item) => {
      const lineAmt = Math.round(item.quantityMt * item.ratePerMt * 100) / 100;
      totalQtyMt += item.quantityMt;
      totalAmt += lineAmt;
      return {
        productId: item.productId,
        packingTypeId: item.packingTypeId,
        quantityMt: item.quantityMt,
        ratePerMt: item.ratePerMt,
        specifications: item.specifications,
        amount: lineAmt,
      };
    });

    if (!this.databaseService.isConnected) {
      return {
        id: 'mock-pi-uuid',
        companyId,
        documentNumber: numbering.documentNumber,
        documentDate: dto.documentDate,
        financialYear: fy,
        customerId: dto.customerId, // Consignee
        consigneeId: dto.consigneeId || null, // Buyer
        notifyPartyId: dto.notifyPartyId || null,
        incoterm: dto.incoterm,
        currency: dto.currency || 'USD',
        exchangeRate: '1.0000',
        portOfLoading: dto.portOfLoading,
        portOfDischarge: dto.portOfDischarge,
        finalDestination: dto.finalDestination,
        paymentTerms: dto.paymentTerms,
        frozenTerms: 'Standard RMM Export Terms & Conditions Snapshotted',
        bankDetailsId: dto.bankDetailsId || null,
        totalQuantityMt: totalQtyMt.toFixed(3),
        totalAmount: totalAmt.toFixed(2),
        status: 'CONFIRMED',
        version: 1,
        deletedAt: null,
        createdBy: userId,
        updatedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const db = this.databaseService.db;

    const created = await db.transaction(async (tx) => {
      const [pi] = await tx
        .insert(proformaInvoices)
        .values({
          companyId,
          documentNumber: numbering.documentNumber,
          documentDate: dto.documentDate,
          financialYear: fy,
          customerId: dto.customerId,
          consigneeId: dto.consigneeId || null,
          notifyPartyId: dto.notifyPartyId || null,
          incoterm: dto.incoterm,
          currency: dto.currency || 'USD',
          exchangeRate: '1.0000',
          portOfLoading: dto.portOfLoading,
          portOfDischarge: dto.portOfDischarge,
          finalDestination: dto.finalDestination,
          paymentTerms: dto.paymentTerms,
          frozenTerms: 'Snapshotted Export Terms',
          bankDetailsId: dto.bankDetailsId || null,
          totalQuantityMt: totalQtyMt.toFixed(3),
          totalAmount: totalAmt.toFixed(2),
          status: 'CONFIRMED',
          version: 1,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      for (const line of lineCalculations) {
        await tx.insert(proformaItems).values({
          proformaInvoiceId: pi.id,
          productId: line.productId,
          packingTypeId: line.packingTypeId,
          quantityMt: line.quantityMt.toFixed(3),
          allocatedProductionMt: '0.000',
          ratePerMt: line.ratePerMt.toFixed(2),
          amount: line.amount.toFixed(2),
          specifications: line.specifications || null,
        });
      }

      await this.activityLogService.record(
        {
          companyId,
          userId,
          username,
          action: 'CREATE',
          entityTable: 'proforma_invoices',
          entityId: pi.id,
          newValues: {
            documentNumber: pi.documentNumber,
            totalAmount: pi.totalAmount,
          },
        },
        tx,
      );

      return pi;
    });

    return created;
  }

  async listProformas(companyId: string): Promise<ProformaInvoice[]> {
    if (!this.databaseService.isConnected) return [];
    return this.databaseService.db
      .select()
      .from(proformaInvoices)
      .where(
        and(
          eq(proformaInvoices.companyId, companyId),
          isNull(proformaInvoices.deletedAt),
        ),
      )
      .orderBy(desc(proformaInvoices.documentDate));
  }

  // -------------------------------------------------------------------------
  // PRODUCTION ORDERS (Work instructions to Rice Mill)
  // -------------------------------------------------------------------------
  async createProductionOrder(
    companyId: string,
    companyCode: string,
    dto: CreateProductionOrderDto,
    userId: string,
    username: string,
  ): Promise<ProductionOrder> {
    const docDate = new Date(dto.documentDate);

    // Numbering allocation: <CODE>/<no>
    const numbering = await this.numberingService.allocateNextNumber(
      companyId,
      companyCode,
      'PRODUCTION_ORDER',
      docDate,
    );

    let totalOrderQty = 0;
    for (const item of dto.items) {
      totalOrderQty += item.quantityMt;
    }

    if (!this.databaseService.isConnected) {
      return {
        id: 'mock-po-uuid',
        companyId,
        documentNumber: numbering.documentNumber,
        documentDate: dto.documentDate,
        proformaInvoiceId: dto.proformaInvoiceId,
        buyerPoNumber: dto.buyerPoNumber || null,
        supplierMillId: dto.supplierMillId || null,
        millingInstructions: dto.millingInstructions || null,
        packagingInstructions: dto.packagingInstructions || null,
        dispatchSchedule: null,
        totalQuantityMt: totalOrderQty.toFixed(3),
        allocatedInvoiceMt: '0.000',
        status: 'PENDING',
        version: 1,
        deletedAt: null,
        createdBy: userId,
        updatedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const db = this.databaseService.db;

    // RULE 8: Remaining-Quantity Check Inside Transaction with FOR UPDATE Lock
    const createdPo = await db.transaction(async (tx) => {
      // 1. Lock and inspect proforma items
      for (const line of dto.items) {
        const [piItem] = await tx
          .select()
          .from(proformaItems)
          .where(eq(proformaItems.id, line.proformaItemId))
          .for('update');

        if (!piItem) {
          throw new NotFoundException(
            `Proforma line item ${line.proformaItemId} not found`,
          );
        }

        const totalQty = parseFloat(piItem.quantityMt);
        const alreadyAllocated = parseFloat(piItem.allocatedProductionMt);
        const remainingQty = totalQty - alreadyAllocated;

        if (line.quantityMt > remainingQty + 0.0001) {
          throw new BadRequestException(
            `Quantity ${line.quantityMt} MT exceeds available remaining proforma balance of ${remainingQty.toFixed(
              3,
            )} MT`,
          );
        }

        // Update allocated quantity on proforma item
        const newAllocated = alreadyAllocated + line.quantityMt;
        await tx
          .update(proformaItems)
          .set({ allocatedProductionMt: newAllocated.toFixed(3) })
          .where(eq(proformaItems.id, line.proformaItemId));
      }

      // 2. Insert Production Order
      const [po] = await tx
        .insert(productionOrders)
        .values({
          companyId,
          documentNumber: numbering.documentNumber,
          documentDate: dto.documentDate,
          proformaInvoiceId: dto.proformaInvoiceId,
          buyerPoNumber: dto.buyerPoNumber || null,
          supplierMillId: dto.supplierMillId || null,
          millingInstructions: dto.millingInstructions || null,
          packagingInstructions: dto.packagingInstructions || null,
          totalQuantityMt: totalOrderQty.toFixed(3),
          allocatedInvoiceMt: '0.000',
          status: 'PENDING',
          version: 1,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      // 3. Insert Production Order Items
      for (const line of dto.items) {
        await tx.insert(productionOrderItems).values({
          productionOrderId: po.id,
          proformaItemId: line.proformaItemId,
          productId: line.productId,
          packingTypeId: line.packingTypeId,
          quantityMt: line.quantityMt.toFixed(3),
          allocatedInvoiceMt: '0.000',
          specifications: line.specifications || null,
        });
      }

      // 4. Audit
      await this.activityLogService.record(
        {
          companyId,
          userId,
          username,
          action: 'CREATE',
          entityTable: 'production_orders',
          entityId: po.id,
          newValues: {
            documentNumber: po.documentNumber,
            totalQuantityMt: po.totalQuantityMt,
          },
        },
        tx,
      );

      return po;
    });

    return createdPo;
  }

  async listProductionOrders(companyId: string): Promise<ProductionOrder[]> {
    if (!this.databaseService.isConnected) return [];
    return this.databaseService.db
      .select()
      .from(productionOrders)
      .where(
        and(
          eq(productionOrders.companyId, companyId),
          isNull(productionOrders.deletedAt),
        ),
      )
      .orderBy(desc(productionOrders.documentDate));
  }
}
