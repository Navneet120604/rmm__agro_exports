import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import {
  commercialInvoices,
  containers,
  invoiceItems,
  productionOrderItems,
  productionOrders,
  proformaInvoices,
  proformaItems,
  receipts,
  shippingCharges,
  type CommercialInvoice,
  type Container,
  type InvoiceItem,
  type ProductionOrder,
  type ProformaInvoice,
  type Receipt,
  type ShippingCharge,
} from '../../database/schema/index.js';
import { ActivityLogService } from '../activity-log/activity-log.service.js';
import {
  computeFinancialYear,
  DocumentNumberingService,
} from '../document-numbering/document-numbering.service.js';
import type {
  CreateCommercialInvoiceDto,
  CreateProductionOrderDto,
  CreateProformaInvoiceDto,
  CreateReceiptDto,
} from './dto/sales.dto.js';
import {
  computeShippingCharges,
  convertAmountToWords,
} from './utils/export-calculations.js';

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

  // -------------------------------------------------------------------------
  // COMMERCIAL INVOICES & PACKING LISTS (Customs & Bank Settlement)
  // -------------------------------------------------------------------------
  async createCommercialInvoice(
    companyId: string,
    companyCode: string,
    dto: CreateCommercialInvoiceDto,
    userId: string,
    username: string,
  ): Promise<CommercialInvoice> {
    const docDate = new Date(dto.documentDate);
    const fy = computeFinancialYear(docDate);

    // 1. Transactional number allocation: <CODE>/EX/<FY>/<no>
    const numbering = await this.numberingService.allocateNextNumber(
      companyId,
      companyCode,
      'COMMERCIAL_INVOICE',
      docDate,
    );

    // 2. Line calculation
    let totalFobAmount = 0;
    const lineCalculations = dto.items.map((item) => {
      const lineAmt = Math.round(item.quantityMt * item.ratePerMt * 100) / 100;
      totalFobAmount += lineAmt;
      return {
        productId: item.productId,
        packingTypeId: item.packingTypeId,
        quantityMt: item.quantityMt,
        ratePerMt: item.ratePerMt,
        specifications: item.specifications,
        amount: lineAmt,
      };
    });
    totalFobAmount = Math.round(totalFobAmount * 100) / 100;

    // 3. Rule 7: Incoterm shipping charges calculation
    const shipping = computeShippingCharges(
      dto.incoterm,
      dto.shippingCharges || {},
    );
    const oceanFreightAmount = shipping.oceanFreightCharge;
    const insuranceAmount = shipping.insuranceCharge;
    const totalInvoiceAmount =
      Math.round(
        (totalFobAmount + oceanFreightAmount + insuranceAmount) * 100,
      ) / 100;

    const currency = dto.currency || 'USD';
    const amountInWords = convertAmountToWords(totalInvoiceAmount, currency);

    if (!this.databaseService.isConnected) {
      return {
        id: 'mock-ci-uuid',
        companyId,
        documentNumber: numbering.documentNumber,
        documentDate: dto.documentDate,
        financialYear: fy,
        proformaInvoiceId: dto.proformaInvoiceId || null,
        productionOrderId: dto.productionOrderId || null,
        buyerPoNumber: dto.buyerPoNumber || null,
        customerId: dto.customerId,
        consigneeId: dto.consigneeId || null,
        notifyPartyId: dto.notifyPartyId || null,
        shippingBillNumber: dto.shippingBillNumber || null,
        shippingBillDate: null,
        blNumber: dto.blNumber || null,
        blDate: null,
        vesselFlightName: dto.vesselFlightName || null,
        voyageNumber: null,
        portOfLoading: dto.portOfLoading,
        portOfDischarge: dto.portOfDischarge,
        countryOfOrigin: 'India',
        countryOfDestination: dto.countryOfDestination,
        incoterm: dto.incoterm,
        currency,
        exchangeRate: '1.0000',
        totalFobAmount: totalFobAmount.toFixed(2),
        oceanFreightAmount: oceanFreightAmount.toFixed(2),
        insuranceAmount: insuranceAmount.toFixed(2),
        totalInvoiceAmount: totalInvoiceAmount.toFixed(2),
        amountInWords,
        lutNumber: null,
        bankDetailsId: dto.bankDetailsId || null,
        frozenTerms: 'Snapshotted Commercial Terms',
        status: 'ISSUED',
        version: 1,
        deletedAt: null,
        createdBy: userId,
        updatedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const db = this.databaseService.db;

    const createdInvoice = await db.transaction(async (tx) => {
      // If linked to production order, validate remaining balance
      if (dto.productionOrderId) {
        const [po] = await tx
          .select()
          .from(productionOrders)
          .where(eq(productionOrders.id, dto.productionOrderId))
          .for('update');

        if (!po) {
          throw new NotFoundException(
            `Production Order ${dto.productionOrderId} not found`,
          );
        }

        const totalPoQty = parseFloat(po.totalQuantityMt);
        const alreadyInvoiced = parseFloat(po.allocatedInvoiceMt);
        const remainingPoQty = totalPoQty - alreadyInvoiced;

        let totalInvQty = 0;
        for (const item of dto.items) {
          totalInvQty += item.quantityMt;
        }

        if (totalInvQty > remainingPoQty + 0.0001) {
          throw new BadRequestException(
            `Total invoice quantity ${totalInvQty.toFixed(
              3,
            )} MT exceeds remaining production order balance of ${remainingPoQty.toFixed(
              3,
            )} MT`,
          );
        }

        const newAllocatedInvoice = alreadyInvoiced + totalInvQty;
        await tx
          .update(productionOrders)
          .set({ allocatedInvoiceMt: newAllocatedInvoice.toFixed(3) })
          .where(eq(productionOrders.id, dto.productionOrderId));
      }

      // Insert Commercial Invoice
      const [invoice] = await tx
        .insert(commercialInvoices)
        .values({
          companyId,
          documentNumber: numbering.documentNumber,
          documentDate: dto.documentDate,
          financialYear: fy,
          proformaInvoiceId: dto.proformaInvoiceId || null,
          productionOrderId: dto.productionOrderId || null,
          buyerPoNumber: dto.buyerPoNumber || null,
          customerId: dto.customerId,
          consigneeId: dto.consigneeId || null,
          notifyPartyId: dto.notifyPartyId || null,
          shippingBillNumber: dto.shippingBillNumber || null,
          shippingBillDate: null,
          blNumber: dto.blNumber || null,
          blDate: null,
          vesselFlightName: dto.vesselFlightName || null,
          voyageNumber: null,
          portOfLoading: dto.portOfLoading,
          portOfDischarge: dto.portOfDischarge,
          countryOfOrigin: 'India',
          countryOfDestination: dto.countryOfDestination,
          incoterm: dto.incoterm,
          currency,
          exchangeRate: '1.0000',
          totalFobAmount: totalFobAmount.toFixed(2),
          oceanFreightAmount: oceanFreightAmount.toFixed(2),
          insuranceAmount: insuranceAmount.toFixed(2),
          totalInvoiceAmount: totalInvoiceAmount.toFixed(2),
          amountInWords,
          lutNumber: null,
          bankDetailsId: dto.bankDetailsId || null,
          frozenTerms: 'Snapshotted Commercial Terms',
          status: 'ISSUED',
          version: 1,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      // Insert Items
      for (const line of lineCalculations) {
        await tx.insert(invoiceItems).values({
          invoiceId: invoice.id,
          productId: line.productId,
          packingTypeId: line.packingTypeId,
          quantityMt: line.quantityMt.toFixed(3),
          ratePerMt: line.ratePerMt.toFixed(2),
          amount: line.amount.toFixed(2),
          specifications: line.specifications || null,
        });
      }

      // Insert Shipping Charges (Rule 7)
      await tx.insert(shippingCharges).values({
        invoiceId: invoice.id,
        incoterm: dto.incoterm,
        thcCharge: shipping.thcCharge.toFixed(2),
        blCharge: shipping.blCharge.toFixed(2),
        sealCharge: shipping.sealCharge.toFixed(2),
        mucCharge: shipping.mucCharge.toFixed(2),
        riskCharge: shipping.riskCharge.toFixed(2),
        repositionCharge: shipping.repositionCharge.toFixed(2),
        oceanFreightCharge: shipping.oceanFreightCharge.toFixed(2),
        insuranceCharge: shipping.insuranceCharge.toFixed(2),
        totalShippingCharge: shipping.totalShippingCharge.toFixed(2),
      });

      // Insert Packing List Containers if provided
      if (dto.containers && dto.containers.length > 0) {
        for (const c of dto.containers) {
          await tx.insert(containers).values({
            invoiceId: invoice.id,
            containerNumber: c.containerNumber,
            sealNumber: c.sealNumber,
            containerSize: c.containerSize || '20FT',
            totalBags: c.totalBags,
            grossWeightKg: c.grossWeightKg.toFixed(3),
            netWeightKg: c.netWeightKg.toFixed(3),
          });
        }
      }

      // Audit Log
      await this.activityLogService.record(
        {
          companyId,
          userId,
          username,
          action: 'CREATE',
          entityTable: 'commercial_invoices',
          entityId: invoice.id,
          newValues: {
            documentNumber: invoice.documentNumber,
            totalInvoiceAmount: invoice.totalInvoiceAmount,
            incoterm: invoice.incoterm,
          },
        },
        tx,
      );

      return invoice;
    });

    return createdInvoice;
  }

  async listCommercialInvoices(
    companyId: string,
  ): Promise<CommercialInvoice[]> {
    if (!this.databaseService.isConnected) return [];
    return this.databaseService.db
      .select()
      .from(commercialInvoices)
      .where(
        and(
          eq(commercialInvoices.companyId, companyId),
          isNull(commercialInvoices.deletedAt),
        ),
      )
      .orderBy(desc(commercialInvoices.documentDate));
  }

  async getCommercialInvoiceById(
    companyId: string,
    id: string,
  ): Promise<{
    invoice: CommercialInvoice;
    items: InvoiceItem[];
    shippingCharges: ShippingCharge | null;
    containers: Container[];
  }> {
    if (!this.databaseService.isConnected) {
      throw new NotFoundException('Database not connected in mock mode');
    }

    const [invoice] = await this.databaseService.db
      .select()
      .from(commercialInvoices)
      .where(
        and(
          eq(commercialInvoices.id, id),
          eq(commercialInvoices.companyId, companyId),
          isNull(commercialInvoices.deletedAt),
        ),
      );

    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    const items = await this.databaseService.db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, id));

    const [shipping] = await this.databaseService.db
      .select()
      .from(shippingCharges)
      .where(eq(shippingCharges.invoiceId, id));

    const containerList = await this.databaseService.db
      .select()
      .from(containers)
      .where(eq(containers.invoiceId, id));

    return {
      invoice,
      items,
      shippingCharges: shipping || null,
      containers: containerList,
    };
  }

  // -------------------------------------------------------------------------
  // RECEIPTS (Payment tracking against Commercial Invoices)
  // -------------------------------------------------------------------------
  async createReceipt(
    companyId: string,
    companyCode: string,
    dto: CreateReceiptDto,
    userId: string,
    username: string,
  ): Promise<Receipt> {
    const recDate = new Date(dto.receiptDate);
    const fy = computeFinancialYear(recDate);

    // Numbering allocation: REC-<CODE>/<FY>/<no>
    const numbering = await this.numberingService.allocateNextNumber(
      companyId,
      companyCode,
      'RECEIPT',
      recDate,
    );

    if (!this.databaseService.isConnected) {
      return {
        id: 'mock-receipt-uuid',
        companyId,
        receiptNumber: numbering.documentNumber,
        receiptDate: dto.receiptDate,
        financialYear: fy,
        commercialInvoiceId: dto.commercialInvoiceId,
        customerId: dto.customerId,
        amountReceived: dto.amountReceived.toFixed(2),
        currency: dto.currency || 'USD',
        exchangeRate: '1.0000',
        bankDetailsId: dto.bankDetailsId || null,
        paymentMode: dto.paymentMode,
        referenceNumber: dto.referenceNumber || null,
        remarks: dto.remarks || null,
        version: 1,
        deletedAt: null,
        createdBy: userId,
        updatedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const db = this.databaseService.db;

    const createdReceipt = await db.transaction(async (tx) => {
      // Verify Commercial Invoice belongs to company
      const [invoice] = await tx
        .select()
        .from(commercialInvoices)
        .where(
          and(
            eq(commercialInvoices.id, dto.commercialInvoiceId),
            eq(commercialInvoices.companyId, companyId),
            isNull(commercialInvoices.deletedAt),
          ),
        );

      if (!invoice) {
        throw new NotFoundException(
          `Commercial Invoice ${dto.commercialInvoiceId} not found for active company`,
        );
      }

      const [receipt] = await tx
        .insert(receipts)
        .values({
          companyId,
          receiptNumber: numbering.documentNumber,
          receiptDate: dto.receiptDate,
          financialYear: fy,
          commercialInvoiceId: dto.commercialInvoiceId,
          customerId: dto.customerId,
          amountReceived: dto.amountReceived.toFixed(2),
          currency: dto.currency || 'USD',
          exchangeRate: '1.0000',
          bankDetailsId: dto.bankDetailsId || null,
          paymentMode: dto.paymentMode,
          referenceNumber: dto.referenceNumber || null,
          remarks: dto.remarks || null,
          version: 1,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      await this.activityLogService.record(
        {
          companyId,
          userId,
          username,
          action: 'CREATE',
          entityTable: 'receipts',
          entityId: receipt.id,
          newValues: {
            receiptNumber: receipt.receiptNumber,
            amountReceived: receipt.amountReceived,
            invoiceNumber: invoice.documentNumber,
          },
        },
        tx,
      );

      return receipt;
    });

    return createdReceipt;
  }

  async listReceipts(companyId: string): Promise<Receipt[]> {
    if (!this.databaseService.isConnected) return [];
    return this.databaseService.db
      .select()
      .from(receipts)
      .where(
        and(eq(receipts.companyId, companyId), isNull(receipts.deletedAt)),
      )
      .orderBy(desc(receipts.receiptDate));
  }
}
