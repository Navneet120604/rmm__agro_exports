import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateLotInputDto {
  @ApiProperty({ example: 1, description: 'Lot sequence number (1, 2, ...)' })
  @IsNumber()
  @Min(1)
  lotNumber!: number;

  @ApiProperty({ example: 100.0, description: 'Quantity in Metric Tons (MT)' })
  @IsNumber()
  @Min(0.001)
  quantityMt!: number;
}

export class CreateMasterOrderDto {
  @ApiProperty({ example: '2026-11-08' })
  @IsString()
  @IsNotEmpty()
  orderDate!: string;

  @ApiProperty({
    description: 'Referenced Proforma Invoice UUID',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  proformaInvoiceId?: string;

  @ApiProperty({ example: 'PO-UAE-2026-991', required: false })
  @IsString()
  @IsOptional()
  buyerPoNumber?: string;

  @ApiProperty({ example: 'LC-EMIRATES-889900', required: false })
  @IsString()
  @IsOptional()
  lcNumber?: string;

  @ApiProperty({ example: '2026-11-01', required: false })
  @IsString()
  @IsOptional()
  lcDate?: string;

  @ApiProperty({ example: '2026-12-31', required: false })
  @IsString()
  @IsOptional()
  lcExpiryDate?: string;

  @ApiProperty({ example: 'Emirates NBD Bank PJSC', required: false })
  @IsString()
  @IsOptional()
  issuingBank?: string;

  @ApiProperty({ example: 500.0, description: 'Total Order Quantity in MT' })
  @IsNumber()
  @Min(0.001)
  totalQuantityMt!: number;

  @ApiProperty({
    type: [CreateLotInputDto],
    required: false,
    description: 'Optional initial shipment lots',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLotInputDto)
  @IsOptional()
  lots?: CreateLotInputDto[];
}

export class AddLotDto {
  @ApiProperty({ description: 'Master Order UUID' })
  @IsUUID()
  @IsNotEmpty()
  masterOrderId!: string;

  @ApiProperty({ example: 2, description: 'Lot sequence number' })
  @IsNumber()
  @Min(1)
  lotNumber!: number;

  @ApiProperty({ example: 150.0, description: 'Quantity in Metric Tons (MT)' })
  @IsNumber()
  @Min(0.001)
  quantityMt!: number;
}

export class UpdateDocumentStatusDto {
  @ApiProperty({
    enum: ['PENDING', 'DRAFTED', 'COLLECTED', 'VERIFIED'],
    example: 'VERIFIED',
  })
  @IsEnum(['PENDING', 'DRAFTED', 'COLLECTED', 'VERIFIED'])
  status!: 'PENDING' | 'DRAFTED' | 'COLLECTED' | 'VERIFIED';

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @ApiProperty({ example: 'Clean On Board Bill of Lading verified with shipping line', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: '/documents/rmm/bl_998877.pdf', required: false })
  @IsString()
  @IsOptional()
  filePath?: string;
}

export class AddDocumentHubItemDto {
  @ApiProperty({ description: 'Master Order UUID' })
  @IsUUID()
  @IsNotEmpty()
  masterOrderId!: string;

  @ApiProperty({ description: 'Specific shipment lot UUID', required: false })
  @IsUUID()
  @IsOptional()
  lotId?: string;

  @ApiProperty({
    example: 'CERT_OF_ORIGIN',
    description: 'Document Type Identifier',
  })
  @IsString()
  @IsNotEmpty()
  documentType!: string;

  @ApiProperty({
    enum: ['GENERATED', 'COLLECTED'],
    example: 'GENERATED',
  })
  @IsEnum(['GENERATED', 'COLLECTED'])
  classification!: 'GENERATED' | 'COLLECTED';

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
