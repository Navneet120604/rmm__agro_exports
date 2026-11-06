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
