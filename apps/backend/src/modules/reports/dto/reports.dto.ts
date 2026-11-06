import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DateRangeFilterDto {
  @ApiProperty({ example: '2026-04-01', required: false, description: 'Start date (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  fromDate?: string;

  @ApiProperty({ example: '2027-03-31', required: false, description: 'End date (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  toDate?: string;
}

export class CustomerReportFilterDto extends DateRangeFilterDto {
  @ApiProperty({ required: false, description: 'Customer UUID filter' })
  @IsString()
  @IsOptional()
  customerId?: string;
}

export class OrderReportFilterDto extends DateRangeFilterDto {
  @ApiProperty({ required: false, description: 'Rice Mill Supplier UUID filter' })
  @IsString()
  @IsOptional()
  supplierMillId?: string;

  @ApiProperty({ required: false, description: 'Status filter (e.g. PENDING, COMPLETED)' })
  @IsString()
  @IsOptional()
  status?: string;
}

export class ReceiptReportFilterDto extends DateRangeFilterDto {
  @ApiProperty({ required: false, description: 'Payment mode filter (e.g. WIRE_TRANSFER, LC_NEGOTIATION)' })
  @IsString()
  @IsOptional()
  paymentMode?: string;
}
