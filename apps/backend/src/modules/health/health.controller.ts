import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator.js';
import {
  HealthService,
  type LivenessStatus,
  type ReadinessStatus,
} from './health.service.js';

@ApiTags('Health & Monitoring')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({
    status: 200,
    description: 'Service is alive and running',
  })
  getLiveness(): LivenessStatus {
    return this.healthService.checkLiveness();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiResponse({
    status: 200,
    description: 'Service is ready to handle traffic',
  })
  getReadiness(): ReadinessStatus {
    return this.healthService.checkReadiness();
  }
}
