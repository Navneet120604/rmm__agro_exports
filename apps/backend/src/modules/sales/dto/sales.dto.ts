import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

// ----------------------------------------------------
// PROFORMA INVOICES
// ----------------------------------------------------
export class ProformaItemDto {
  @ApiProperty({ description: 'Product UUID' })
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ description: 'Packing Type UUID' })
  @IsUUID()
  @IsNotEmpty()
  packingTypeId!: string;

  @ApiProperty({ example: 250.0, description: 'Quantity in Metric Tons (MT)' })
  @IsNumber()
  @Min(0.001)
  quantityMt!: number;

  @ApiProperty({ example: 980.0, description: 'Rate in USD per MT' })
  @IsNumber()
  @Min(0.01)
  ratePerMt!: number;

  @ApiProperty({ example: 'Max 1% Broken, Silky Polished', required: false })
  @IsString()
  @IsOptional()
  specifications?: string;
}

export class CreateProformaInvoiceDto {
  @ApiProperty({ example: '2026-11-06' })
  @IsString()
  @IsNotEmpty()
  documentDate!: string;

  @ApiProperty({
    example: '00000000-0000-0000-0000-000000000001',
    description: 'Consignee customer UUID (Rule 10 Gotcha: stored in customer slot)',
  })
  @IsUUID()
  @IsNotEmpty()
  customerId!: string;

  @ApiProperty({
    example: '00000000-0000-0000-0000-000000000002',
    description: 'Foreign Buyer customer UUID (Rule 10 Gotcha: stored in consignee slot)',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  consigneeId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  notifyPartyId?: string;

  @ApiProperty({ enum: ['FOB', 'CFR', 'CIF'], example: 'CIF' })
  @IsEnum(['FOB', 'CFR', 'CIF'])
  incoterm!: 'FOB' | 'CFR' | 'CIF';

  @ApiProperty({ example: 'USD', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: 'Mundra Port, India' })
  @IsString()
  @IsNotEmpty()
  portOfLoading!: string;

  @ApiProperty({ example: 'Jebel Ali, UAE' })
  @IsString()
  @IsNotEmpty()
  portOfDischarge!: string;

  @ApiProperty({ example: 'Dubai, UAE' })
  @IsString()
  @IsNotEmpty()
  finalDestination!: string;

  @ApiProperty({ example: '100% Irrevocable Confirmed LC at sight' })
  @IsString()
  @IsNotEmpty()
  paymentTerms!: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  bankDetailsId?: string;

  @ApiProperty({ type: [ProformaItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProformaItemDto)
  items!: ProformaItemDto[];
}

// ----------------------------------------------------
// PRODUCTION ORDERS
// ----------------------------------------------------
export class ProductionOrderItemDto {
  @ApiProperty({ description: 'Proforma Item UUID being fulfilled' })
  @IsUUID()
  @IsNotEmpty()
  proformaItemId!: string;

  @ApiProperty({ description: 'Product UUID' })
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ description: 'Packing Type UUID' })
  @IsUUID()
  @IsNotEmpty()
  packingTypeId!: string;

  @ApiProperty({ example: 100.0, description: 'Quantity in Metric Tons (MT)' })
  @IsNumber()
  @Min(0.001)
  quantityMt!: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  specifications?: string;
}

export class CreateProductionOrderDto {
  @ApiProperty({ example: '2026-11-07' })
  @IsString()
  @IsNotEmpty()
  documentDate!: string;

  @ApiProperty({ description: 'Referenced Proforma Invoice UUID' })
  @IsUUID()
  @IsNotEmpty()
  proformaInvoiceId!: string;

  @ApiProperty({ example: 'PO-UAE-9921', required: false })
  @IsString()
  @IsOptional()
  buyerPoNumber?: string;

  @ApiProperty({ description: 'Rice Mill Supplier UUID', required: false })
  @IsUUID()
  @IsOptional()
  supplierMillId?: string;

  @ApiProperty({ example: 'Double polish, sortex clean, moisture < 12%' })
  @IsString()
  @IsOptional()
  millingInstructions?: string;

  @ApiProperty({ example: 'Bags to be stitched with red thread' })
  @IsString()
  @IsOptional()
  packagingInstructions?: string;

  @ApiProperty({ type: [ProductionOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductionOrderItemDto)
  items!: ProductionOrderItemDto[];
}

// ----------------------------------------------------
// COMMERCIAL INVOICES & PACKING LISTS
// ----------------------------------------------------
export class ContainerDto {
  @ApiProperty({ example: 'MSCU1234567', description: 'Container number' })
  @IsString()
  @IsNotEmpty()
  containerNumber!: string;

  @ApiProperty({ example: 'SEAL-987654', description: 'Customs line seal number' })
  @IsString()
  @IsNotEmpty()
  sealNumber!: string;

  @ApiProperty({ example: '20FT', default: '20FT' })
  @IsString()
  @IsOptional()
  containerSize?: string;

  @ApiProperty({ example: 833, description: 'Total bags packed in container' })
  @IsNumber()
  totalBags!: number;

  @ApiProperty({ example: 25100.0, description: 'Gross weight in KG' })
  @IsNumber()
  grossWeightKg!: number;

  @ApiProperty({ example: 25000.0, description: 'Net weight in KG' })
  @IsNumber()
  netWeightKg!: number;
}

export class ShippingChargesDto {
  @ApiProperty({ example: 150.0, required: false })
  @IsNumber()
  @IsOptional()
  thcCharge?: number;

  @ApiProperty({ example: 50.0, required: false })
  @IsNumber()
  @IsOptional()
  blCharge?: number;

  @ApiProperty({ example: 15.0, required: false })
  @IsNumber()
  @IsOptional()
  sealCharge?: number;

  @ApiProperty({ example: 25.0, required: false })
  @IsNumber()
  @IsOptional()
  mucCharge?: number;

  @ApiProperty({ example: 10.0, required: false })
  @IsNumber()
  @IsOptional()
  riskCharge?: number;

  @ApiProperty({ example: 100.0, required: false })
  @IsNumber()
  @IsOptional()
  repositionCharge?: number;

  @ApiProperty({ example: 1200.0, required: false })
  @IsNumber()
  @IsOptional()
  oceanFreightCharge?: number;

  @ApiProperty({ example: 85.0, required: false })
  @IsNumber()
  @IsOptional()
  insuranceCharge?: number;
}

export class InvoiceItemDto {
  @ApiProperty({ description: 'Product UUID' })
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ description: 'Packing Type UUID' })
  @IsUUID()
  @IsNotEmpty()
  packingTypeId!: string;

  @ApiProperty({ example: 100.0, description: 'Quantity in Metric Tons (MT)' })
  @IsNumber()
  @Min(0.001)
  quantityMt!: number;

  @ApiProperty({ example: 980.0, description: 'FOB Rate per MT' })
  @IsNumber()
  @Min(0.01)
  ratePerMt!: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  specifications?: string;
}

export class CreateCommercialInvoiceDto {
  @ApiProperty({ example: '2026-11-08' })
  @IsString()
  @IsNotEmpty()
  documentDate!: string;

  @ApiProperty({ description: 'Referenced Proforma Invoice UUID', required: false })
  @IsUUID()
  @IsOptional()
  proformaInvoiceId?: string;

  @ApiProperty({ description: 'Referenced Production Order UUID', required: false })
  @IsUUID()
  @IsOptional()
  productionOrderId?: string;

  @ApiProperty({ example: 'PO-UAE-9921', required: false })
  @IsString()
  @IsOptional()
  buyerPoNumber?: string;

  @ApiProperty({ description: 'Customer UUID' })
  @IsUUID()
  @IsNotEmpty()
  customerId!: string;

  @ApiProperty({ description: 'Consignee UUID', required: false })
  @IsUUID()
  @IsOptional()
  consigneeId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  notifyPartyId?: string;

  @ApiProperty({ example: 'SB-8877665', required: false })
  @IsString()
  @IsOptional()
  shippingBillNumber?: string;

  @ApiProperty({ example: 'MSCU-DXB-001', required: false })
  @IsString()
  @IsOptional()
  blNumber?: string;

  @ApiProperty({ example: 'MSC REGINA', required: false })
  @IsString()
  @IsOptional()
  vesselFlightName?: string;

  @ApiProperty({ example: 'Mundra Port, India' })
  @IsString()
  @IsNotEmpty()
  portOfLoading!: string;

  @ApiProperty({ example: 'Jebel Ali, UAE' })
  @IsString()
  @IsNotEmpty()
  portOfDischarge!: string;

  @ApiProperty({ example: 'United Arab Emirates' })
  @IsString()
  @IsNotEmpty()
  countryOfDestination!: string;

  @ApiProperty({ enum: ['FOB', 'CFR', 'CIF'], example: 'CIF' })
  @IsEnum(['FOB', 'CFR', 'CIF'])
  incoterm!: 'FOB' | 'CFR' | 'CIF';

  @ApiProperty({ example: 'USD', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  bankDetailsId?: string;

  @ApiProperty({ type: [InvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items!: InvoiceItemDto[];

  @ApiProperty({ type: ShippingChargesDto, required: false })
  @ValidateNested()
  @Type(() => ShippingChargesDto)
  @IsOptional()
  shippingCharges?: ShippingChargesDto;

  @ApiProperty({ type: [ContainerDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContainerDto)
  @IsOptional()
  containers?: ContainerDto[];
}

// ----------------------------------------------------
// RECEIPTS
// ----------------------------------------------------
export class CreateReceiptDto {
  @ApiProperty({ example: '2026-11-10' })
  @IsString()
  @IsNotEmpty()
  receiptDate!: string;

  @ApiProperty({ description: 'Commercial Invoice UUID being settled' })
  @IsUUID()
  @IsNotEmpty()
  commercialInvoiceId!: string;

  @ApiProperty({ description: 'Customer UUID' })
  @IsUUID()
  @IsNotEmpty()
  customerId!: string;

  @ApiProperty({ example: 98000.0, description: 'Amount received in invoice currency' })
  @IsNumber()
  @Min(0.01)
  amountReceived!: number;

  @ApiProperty({ example: 'USD', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: 'WIRE_TRANSFER', enum: ['WIRE_TRANSFER', 'LC_NEGOTIATION', 'CHEQUE', 'OTHER'] })
  @IsString()
  @IsNotEmpty()
  paymentMode!: string;

  @ApiProperty({ example: 'SWIFT-REF-20261109987', required: false })
  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  bankDetailsId?: string;
}
