import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';

@ApiTags('Root')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Base root status' })
  @ApiResponse({ status: 200, description: 'Service greeting and status' })
  getHello(): string {
    return this.appService.getHello();
  }
}
