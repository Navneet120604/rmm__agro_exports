import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({
    example: 'Al-Barakah General Trading LLC',
    description: 'Trading entity name',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'ALBARAKAH',
    description: 'Short customer code',
    required: false,
  })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({
    example: 'Tariq Al-Mansoor',
    description: 'Contact person name',
    required: false,
  })
  @IsString()
  @IsOptional()
  contactPerson?: string;

  @ApiProperty({
    example: 'procurement@albarakah.ae',
    description: 'Email address',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: '+971-4-2345678',
    description: 'Phone number',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    example: 'Al-Ras, Deira, P.O. Box 41234',
    description: 'Full shipping / registered address',
  })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({
    example: 'Dubai',
    description: 'City',
    required: false,
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({
    example: 'United Arab Emirates',
    description: 'Destination Country',
  })
  @IsString()
  @IsNotEmpty()
  country!: string;

  @ApiProperty({
    example: 'TRN-100234567800003',
    description: 'Tax / VAT / TRN number',
    required: false,
  })
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isBuyer?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isConsignee?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isNotifyParty?: boolean;
}

export class UpdateCustomerDto extends CreateCustomerDto {
  @ApiProperty({
    example: 1,
    description: 'Record version for optimistic concurrency control',
  })
  @IsNotEmpty()
  version!: number;
}
