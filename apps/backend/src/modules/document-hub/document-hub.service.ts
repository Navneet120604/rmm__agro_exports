import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import {
  documentHubItems,
  masterOrders,
  orderLots,
  type DocumentHubItem,
  type MasterOrder,
  type OrderLot,
} from '../../database/schema/index.js';
import { ActivityLogService } from '../activity-log/activity-log.service.js';
import { DocumentNumberingService } from '../document-numbering/document-numbering.service.js';
import type {
  AddDocumentHubItemDto,
  AddLotDto,
  CreateMasterOrderDto,
  UpdateDocumentStatusDto,
} from './dto/document-hub.dto.js';

export interface StandardChecklistTemplate {
  documentType: string;
  classification: 'GENERATED' | 'COLLECTED';
  notes?: string;
}

export const STANDARD_EXPORT_DOCUMENTS: StandardChecklistTemplate[] = [
  {
    documentType: 'COMMERCIAL_INVOICE',
    classification: 'GENERATED',
    notes: 'Signed and stamped export commercial invoice in quadruplicate',
  },
  {
    documentType: 'PACKING_LIST',
    classification: 'GENERATED',
    notes: 'Detailed container-wise gross/net weight packing list',
  },
  {
    documentType: 'CERTIFICATE_OF_ORIGIN',
    classification: 'GENERATED',
    notes: 'Issued by Chamber of Commerce / Export Inspection Agency',
  },
  {
    documentType: 'BILL_OF_EXCHANGE',
    classification: 'GENERATED',
    notes: 'Financial draft for LC negotiation / collection',
  },
  {
    documentType: 'BENEFICIARY_CERTIFICATE',
    classification: 'GENERATED',
    notes: 'Confirming non-negotiable document copies courier to buyer',
  },
  {
    documentType: 'BILL_OF_LADING',
    classification: 'COLLECTED',
    notes: 'Full set clean on board shipping line marine B/L',
  },
  {
    documentType: 'INSURANCE_CERTIFICATE',
    classification: 'COLLECTED',
    notes: 'Institute Cargo Clauses (A) all-risks marine insurance',
  },
  {
    documentType: 'PHYTOSANITARY_CERTIFICATE',
    classification: 'COLLECTED',
    notes: 'Issued by Ministry of Agriculture Plant Quarantine Office',
  },
  {
    documentType: 'INSPECTION_CERTIFICATE',
    classification: 'COLLECTED',
    notes: 'Pre-shipment weight and quality survey report (SGS/GeoChem)',
  },
];

@Injectable()
export class DocumentHubService {
  private readonly logger = new Logger(DocumentHubService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly numberingService: DocumentNumberingService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // -------------------------------------------------------------------------
  // MASTER ORDERS & SHIPMENT LOTS
  // -------------------------------------------------------------------------
  async createMasterOrder(
    companyId: string,
    companyCode: string,
    dto: CreateMasterOrderDto,
    userId: string,
    username: string,
  ): Promise<MasterOrder> {
    const orderDate = new Date(dto.orderDate);

    // Numbering allocation: ORD-<CODE>/<FY>/<no>
    const numbering = await this.numberingService.allocateNextNumber(
      companyId,
      companyCode,
      'MASTER_ORDER',
      orderDate,
    );

    // If initial lots supplied, validate they do not exceed total
    if (dto.lots && dto.lots.length > 0) {
      let lotSum = 0;
      for (const lot of dto.lots) {
        lotSum += lot.quantityMt;
      }
      if (lotSum > dto.totalQuantityMt + 0.0001) {
        throw new BadRequestException(
          `Sum of initial lot quantities (${lotSum.toFixed(
            3,
          )} MT) exceeds total master order quantity of ${dto.totalQuantityMt.toFixed(
            3,
          )} MT`,
        );
      }
    }

    if (!this.databaseService.isConnected) {
      return {
        id: 'mock-order-uuid',
        companyId,
        orderNumber: numbering.documentNumber,
        orderDate: dto.orderDate,
        proformaInvoiceId: dto.proformaInvoiceId || null,
        buyerPoNumber: dto.buyerPoNumber || null,
        lcNumber: dto.lcNumber || null,
        lcDate: dto.lcDate || null,
        lcExpiryDate: dto.lcExpiryDate || null,
        issuingBank: dto.issuingBank || null,
        totalQuantityMt: dto.totalQuantityMt.toFixed(3),
        status: 'ACTIVE',
        version: 1,
        deletedAt: null,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const db = this.databaseService.db;

    const createdOrder = await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(masterOrders)
        .values({
          companyId,
          orderNumber: numbering.documentNumber,
          orderDate: dto.orderDate,
          proformaInvoiceId: dto.proformaInvoiceId || null,
          buyerPoNumber: dto.buyerPoNumber || null,
          lcNumber: dto.lcNumber || null,
          lcDate: dto.lcDate || null,
          lcExpiryDate: dto.lcExpiryDate || null,
          issuingBank: dto.issuingBank || null,
          totalQuantityMt: dto.totalQuantityMt.toFixed(3),
          status: 'ACTIVE',
          version: 1,
          createdBy: userId,
        })
        .returning();

      // Insert lots if provided
      if (dto.lots && dto.lots.length > 0) {
        for (const lot of dto.lots) {
          await tx.insert(orderLots).values({
            masterOrderId: order.id,
            lotNumber: lot.lotNumber,
            quantityMt: lot.quantityMt.toFixed(3),
            status: 'PLANNED',
          });
        }
      }

      // Initialize standard export document checklist
      for (const item of STANDARD_EXPORT_DOCUMENTS) {
        await tx.insert(documentHubItems).values({
          masterOrderId: order.id,
          documentType: item.documentType,
          classification: item.classification,
          status: 'PENDING',
          isVerified: false,
          notes: item.notes || null,
        });
      }

      await this.activityLogService.record(
        {
          companyId,
          userId,
          username,
          action: 'CREATE',
          entityTable: 'master_orders',
          entityId: order.id,
          newValues: {
            orderNumber: order.orderNumber,
            totalQuantityMt: order.totalQuantityMt,
            lcNumber: order.lcNumber,
          },
        },
        tx,
      );

      return order;
    });

    return createdOrder;
  }

  async listMasterOrders(companyId: string): Promise<MasterOrder[]> {
    if (!this.databaseService.isConnected) return [];
    return this.databaseService.db
      .select()
      .from(masterOrders)
      .where(
        and(eq(masterOrders.companyId, companyId), isNull(masterOrders.deletedAt)),
      )
      .orderBy(desc(masterOrders.orderDate));
  }

  async getMasterOrderDetails(
    companyId: string,
    orderId: string,
  ): Promise<{
    order: MasterOrder;
    lots: OrderLot[];
    documents: DocumentHubItem[];
    progress: {
      total: number;
      verified: number;
      percentage: number;
    };
  }> {
    if (!this.databaseService.isConnected) {
      throw new NotFoundException('Database not connected in mock mode');
    }

    const [order] = await this.databaseService.db
      .select()
      .from(masterOrders)
      .where(
        and(
          eq(masterOrders.id, orderId),
          eq(masterOrders.companyId, companyId),
          isNull(masterOrders.deletedAt),
        ),
      );

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const lots = await this.databaseService.db
      .select()
      .from(orderLots)
      .where(eq(orderLots.masterOrderId, orderId))
      .orderBy(orderLots.lotNumber);

    const documents = await this.databaseService.db
      .select()
      .from(documentHubItems)
      .where(eq(documentHubItems.masterOrderId, orderId));

    const total = documents.length;
    const verified = documents.filter((d) => d.isVerified).length;
    const percentage = total > 0 ? Math.round((verified / total) * 100) : 0;

    return {
      order,
      lots,
      documents,
      progress: {
        total,
        verified,
        percentage,
      },
    };
  }

  async addLot(
    companyId: string,
    dto: AddLotDto,
  ): Promise<OrderLot> {
    if (!this.databaseService.isConnected) {
      return {
        id: 'mock-lot-uuid',
        masterOrderId: dto.masterOrderId,
        lotNumber: dto.lotNumber,
        quantityMt: dto.quantityMt.toFixed(3),
        commercialInvoiceId: null,
        status: 'PLANNED',
        createdAt: new Date(),
      };
    }

    const db = this.databaseService.db;

    return db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(masterOrders)
        .where(
          and(
            eq(masterOrders.id, dto.masterOrderId),
            eq(masterOrders.companyId, companyId),
            isNull(masterOrders.deletedAt),
          ),
        );

      if (!order) {
        throw new NotFoundException(`Order ${dto.masterOrderId} not found`);
      }

      const existingLots = await tx
        .select()
        .from(orderLots)
        .where(eq(orderLots.masterOrderId, dto.masterOrderId));

      let currentAllocated = 0;
      for (const l of existingLots) {
        currentAllocated += parseFloat(l.quantityMt);
      }

      const totalOrderQty = parseFloat(order.totalQuantityMt);
      if (currentAllocated + dto.quantityMt > totalOrderQty + 0.0001) {
        throw new BadRequestException(
          `Adding lot of ${dto.quantityMt.toFixed(
            3,
          )} MT exceeds available unallocated order quantity of ${(
            totalOrderQty - currentAllocated
          ).toFixed(3)} MT`,
        );
      }

      const [lot] = await tx
        .insert(orderLots)
        .values({
          masterOrderId: dto.masterOrderId,
          lotNumber: dto.lotNumber,
          quantityMt: dto.quantityMt.toFixed(3),
          status: 'PLANNED',
        })
        .returning();

      return lot;
    });
  }

  // -------------------------------------------------------------------------
  // DOCUMENT HUB CHECKLIST & VERIFICATION
  // -------------------------------------------------------------------------
  async addDocumentItem(
    companyId: string,
    dto: AddDocumentHubItemDto,
  ): Promise<DocumentHubItem> {
    if (!this.databaseService.isConnected) {
      return {
        id: 'mock-doc-uuid',
        masterOrderId: dto.masterOrderId,
        lotId: dto.lotId || null,
        documentType: dto.documentType,
        classification: dto.classification,
        status: 'PENDING',
        filePath: null,
        isVerified: false,
        notes: dto.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Verify order belongs to company
    const [order] = await this.databaseService.db
      .select()
      .from(masterOrders)
      .where(
        and(
          eq(masterOrders.id, dto.masterOrderId),
          eq(masterOrders.companyId, companyId),
          isNull(masterOrders.deletedAt),
        ),
      );

    if (!order) {
      throw new NotFoundException(`Order ${dto.masterOrderId} not found`);
    }

    const [docItem] = await this.databaseService.db
      .insert(documentHubItems)
      .values({
        masterOrderId: dto.masterOrderId,
        lotId: dto.lotId || null,
        documentType: dto.documentType,
        classification: dto.classification,
        status: 'PENDING',
        isVerified: false,
        notes: dto.notes || null,
      })
      .returning();

    return docItem;
  }

  async updateDocumentStatus(
    companyId: string,
    documentItemId: string,
    dto: UpdateDocumentStatusDto,
    userId: string,
    username: string,
  ): Promise<DocumentHubItem> {
    if (!this.databaseService.isConnected) {
      return {
        id: documentItemId,
        masterOrderId: 'mock-order-uuid',
        lotId: null,
        documentType: 'BILL_OF_LADING',
        classification: 'COLLECTED',
        status: dto.status,
        filePath: dto.filePath || null,
        isVerified: dto.isVerified ?? false,
        notes: dto.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const db = this.databaseService.db;

    return db.transaction(async (tx) => {
      // Find document item and ensure master order belongs to company
      const [item] = await tx
        .select()
        .from(documentHubItems)
        .where(eq(documentHubItems.id, documentItemId));

      if (!item) {
        throw new NotFoundException(`Document item ${documentItemId} not found`);
      }

      const [order] = await tx
        .select()
        .from(masterOrders)
        .where(
          and(
            eq(masterOrders.id, item.masterOrderId),
            eq(masterOrders.companyId, companyId),
            isNull(masterOrders.deletedAt),
          ),
        );

      if (!order) {
        throw new NotFoundException(
          `Document does not belong to active company's orders`,
        );
      }

      const [updated] = await tx
        .update(documentHubItems)
        .set({
          status: dto.status,
          isVerified: dto.isVerified !== undefined ? dto.isVerified : item.isVerified,
          notes: dto.notes !== undefined ? dto.notes : item.notes,
          filePath: dto.filePath !== undefined ? dto.filePath : item.filePath,
          updatedAt: new Date(),
        })
        .where(eq(documentHubItems.id, documentItemId))
        .returning();

      await this.activityLogService.record(
        {
          companyId,
          userId,
          username,
          action: 'UPDATE',
          entityTable: 'document_hub_items',
          entityId: updated.id,
          newValues: {
            documentType: updated.documentType,
            status: updated.status,
            isVerified: updated.isVerified,
          },
        },
        tx,
      );

      return updated;
    });
  }
}
