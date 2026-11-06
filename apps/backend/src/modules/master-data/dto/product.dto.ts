import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    example: '1121 Creamy Sella Basmati Rice',
    description: 'Product trade name',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '1121-SELLA', required: false })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({
    example: '10063020',
    description: 'Customs HSN code',
    default: '10063020',
  })
  @IsString()
  @IsOptional()
  hsnCode?: string;

  @ApiProperty({
    example: '1121',
    description: 'Rice variety (1121, 1509, Sugandha, etc.)',
  })
  @IsString()
  @IsNotEmpty()
  variety!: string;

  @ApiProperty({
    example: 'SELLA_CREAMY',
    description: 'Processing type (STEAM, SELLA_CREAMY, SELLA_GOLDEN, RAW)',
  })
  @IsString()
  @IsNotEmpty()
  processingType!: string;

  @ApiProperty({ example: '1.00', description: 'Broken % tier (e.g. 1.00, 2.00, 5.00)' })
  @IsString()
  @IsOptional()
  defaultBrokenPercentage?: string;

  @ApiProperty({ example: '8.35', description: 'Average grain length in mm' })
  @IsString()
  @IsOptional()
  grainLengthMm?: string;

  @ApiProperty({ example: '12.50', description: 'Max moisture %' })
  @IsString()
  @IsOptional()
  moistureMaxPercentage?: string;

  @ApiProperty({ example: '95.00', description: 'Min purity %' })
  @IsString()
  @IsOptional()
  purityPercentage?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateProductDto extends CreateProductDto {
  @ApiProperty({
    example: 1,
    description: 'Record version for optimistic concurrency control',
  })
  @IsNotEmpty()
  version!: number;
}
