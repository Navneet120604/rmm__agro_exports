import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class SwitchCompanyDto {
  @ApiProperty({
    example: '00000000-0000-0000-0000-000000000002',
    description: 'Target company UUID to switch active session to',
  })
  @IsUUID()
  @IsNotEmpty()
  targetCompanyId!: string;
}
