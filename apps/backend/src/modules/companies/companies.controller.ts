import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CompaniesService } from './companies.service.js';

@ApiTags('Companies & Multi-Tenancy')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('my-companies')
  @ApiOperation({
    summary: 'List exporting sister companies accessible to the logged-in user',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of authorized sister companies',
  })
  async getMyCompanies(@Req() req: any) {
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
    const role = req.user?.role || 'admin';
    return this.companiesService.getCompaniesForUser(userId, role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full details of a specific exporting company' })
  @ApiResponse({ status: 200, description: 'Company profile and tax codes' })
  async getCompanyById(@Param('id') id: string) {
    return this.companiesService.getCompanyById(id);
  }
}
