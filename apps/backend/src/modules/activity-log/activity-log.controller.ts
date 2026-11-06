import { Controller, Get, Query, Req } from '@nestjs/common';
import {
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ActivityLogService } from './activity-log.service.js';

@ApiTags('Settings / Activity Log')
@ApiSecurity('bearer')
@Controller('activity-logs')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @ApiOperation({
    summary: 'View company activity audit trail (Admin only)',
  })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @ApiResponse({ status: 200, description: 'Paginated activity log records' })
  async getLogs(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const companyId = req.user?.activeCompanyId || req.headers['x-company-id'];
    const parsedLimit = Math.min(Number(limit) || 50, 200);
    const parsedOffset = Number(offset) || 0;

    if (!companyId) {
      return [];
    }

    return this.activityLogService.findByCompany(
      companyId,
      parsedLimit,
      parsedOffset,
    );
  }
}
