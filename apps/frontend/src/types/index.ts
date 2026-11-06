export interface Company {
  id: string;
  name: string;
  code: string;
  gstin: string;
  iec: string;
  address: string;
  currency: string;
}

export interface KPIStats {
  totalExportedMt: number;
  totalSalesUsd: number;
  totalOutstandingDueUsd: number;
  activeOrdersCount: number;
  pendingProductionOrdersCount: number;
}

export interface ActivityItem {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'COMPANY_SWITCH';
  entityTable: string;
  entityId: string;
  username: string;
  timestamp: string;
  details?: string;
}

export interface InvoiceLineItem {
  id: string;
  productId: string;
  productName: string;
  packingTypeId: string;
  packingName: string;
  quantityMt: number;
  ratePerMt: number;
  amount: number;
  specifications?: string;
}

export interface ContainerItem {
  id: string;
  containerNumber: string;
  sealNumber: string;
  containerSize: string;
  totalBags: number;
  grossWeightKg: number;
  netWeightKg: number;
}

export type NavigationSection =
  | 'dashboard'
  | 'proformas'
  | 'production-orders'
  | 'commercial-invoices'
  | 'packing-lists'
  | 'document-hub'
  | 'receipts'
  | 'customers'
  | 'products'
  | 'suppliers'
  | 'registers'
  | 'settings';
