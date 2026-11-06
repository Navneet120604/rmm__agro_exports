import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  Res,
  Headers,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { Public } from './decorators/public.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { SwitchCompanyDto } from './dto/switch-company.dto.js';

@ApiTags('Authentication & Sessions')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in with username/password and select active company',
  })
  @ApiResponse({
    status: 200,
    description:
      'Successfully authenticated; sets HttpOnly cookie and returns user context',
  })
  @ApiResponse({ status: 401, description: 'Invalid username or password' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.login(
      dto.username,
      dto.password,
      res,
      dto.companyId,
      ipAddress,
      userAgent,
    );
  }

  @Post('switch-company')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('bearer')
  @ApiOperation({
    summary:
      'Switch active sister company without logging out (Provided user has authorized access)',
  })
  @ApiResponse({
    status: 200,
    description: 'Active company switched; re-issues signed session cookie',
  })
  @ApiResponse({
    status: 400,
    description: 'User not authorized for target company',
  })
  async switchCompany(
    @Req() req: Request,
    @Body() dto: SwitchCompanyDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const currentUser = (req as any).user;
    return this.authService.switchCompany(
      currentUser,
      dto.targetCompanyId,
      res,
      ipAddress,
      userAgent,
    );
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out and clear session cookie' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const currentUser = (req as any).user || null;
    return this.authService.logout(currentUser, res, ipAddress, userAgent);
  }

  @Get('me')
  @ApiSecurity('bearer')
  @ApiOperation({
    summary: 'Get current authenticated user profile and active company context',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user profile with active company',
  })
  async getProfile(@Req() req: Request) {
    const user = (req as any).user;
    return {
      user,
      activeCompanyId: user?.activeCompanyId,
      activeCompanyCode: user?.activeCompanyCode,
    };
  }
}
