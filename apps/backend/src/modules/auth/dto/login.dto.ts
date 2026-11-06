import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin', description: 'Username or email' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'Admin@123', description: 'User password' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    example: '00000000-0000-0000-0000-000000000001',
    description: 'Initial company ID to activate upon login (optional)',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  companyId?: string;
}
