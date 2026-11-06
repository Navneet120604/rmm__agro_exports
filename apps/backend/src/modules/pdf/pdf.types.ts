export interface CompanyHeaderData {
  name: string;
  code: string;
  address?: string;
  gstin?: string;
  iec?: string;
  phone?: string;
  email?: string;
}

export interface CustomerPartyData {
  name: string;
  address: string;
  country: string;
  taxId?: string;
}

export interface InvoiceLineItemPdf {
  productName: string;
  packingDescription: string;
  quantityMt: number;
  ratePerMt: number;
  amount: number;
  specifications?: string;
}

export interface ContainerPdfData {
  containerNumber: string;
  sealNumber: string;
  containerSize: string;
  totalBags: number;
  grossWeightKg: number;
  netWeightKg: number;
}

export interface CommercialInvoicePdfData {
  company: CompanyHeaderData;
  buyer: CustomerPartyData;
  consignee?: CustomerPartyData;
  documentNumber: string;
  documentDate: string;
  financialYear: string;
  buyerPoNumber?: string;
  portOfLoading: string;
  portOfDischarge: string;
  countryOfDestination: string;
  incoterm: string;
  currency: string;
  items: InvoiceLineItemPdf[];
  totalFobAmount: number;
  oceanFreightAmount: number;
  insuranceAmount: number;
  totalInvoiceAmount: number;
  amountInWords: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    swiftCode: string;
    branchName?: string;
  };
  containers?: ContainerPdfData[];
}
