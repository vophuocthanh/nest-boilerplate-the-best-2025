import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { User } from '@prisma/client';

import { Request as ExpressRequest } from 'express';

import { CurrentUser } from '@app/src/common/decorators/current-user.decorator';
import { Public } from '@app/src/common/decorators/public.decorator';
import { ApiCommonResponses } from '@app/src/decorator/api-common-responses.decorator';
import { AuthService } from '@app/src/modules/auth/auth.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResendVerificationEmailDto,
  ResetPasswordDto,
} from '@app/src/modules/auth/dto/auth.dto';
import { LoginDto } from '@app/src/modules/auth/dto/login.dto';
import { RefreshTokenDto } from '@app/src/modules/auth/dto/refresh-token.dto';
import { RegisterDto } from '@app/src/modules/auth/dto/register.dto';
import { VerifyEmailDto } from '@app/src/modules/auth/dto/verify-code';
import { AuthResult } from '@app/src/modules/auth/types/auth.types';

@ApiBearerAuth()
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Chống brute-force/spam: tối đa 5 request / 60s cho mỗi IP
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiCommonResponses('Register account')
  async register(@Body() body: RegisterDto): Promise<{ message: string }> {
    const result = await this.authService.register(body);
    return {
      ...result,
      message: 'AUTH.REGISTER_SUCCESS',
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiCommonResponses('Verify email')
  @Post('verify-email')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    const result = await this.authService.verifyEmail(
      verifyEmailDto.email,
      verifyEmailDto.verificationCode,
    );
    return {
      ...result,
      message: 'SUCCESS.UPDATED',
    };
  }

  // Chống brute-force mật khẩu: tối đa 5 request / 60s cho mỗi IP
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @ApiCommonResponses('Login')
  async login(
    @Body() body: LoginDto,
  ): Promise<{ data: AuthResult; message: string }> {
    const result = await this.authService.login(body);
    return {
      data: result,
      message: 'AUTH.LOGIN_SUCCESS',
    };
  }

  @Public()
  @Post('refresh-token')
  @ApiCommonResponses('Refresh token (rotation)')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Public()
  @Post('logout')
  @ApiCommonResponses('Logout (thu hồi refresh token)')
  async logout(@Body() body: RefreshTokenDto) {
    return this.authService.logout(body.refreshToken);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  @ApiCommonResponses('Forgot password')
  async forgotPassword(
    @Body() body: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const result = await this.authService.forgotPassword(body);
    return {
      ...result,
      message: 'SUCCESS.UPDATED',
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Put('reset-password')
  @ApiCommonResponses('Reset password (dùng token từ email)')
  async resetPassword(
    @Body() body: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const result = await this.authService.resetPassword(
      body.token,
      body.newPassword,
      body.confirm_password,
    );
    return {
      ...result,
      message: 'SUCCESS.UPDATED',
    };
  }

  @ApiCommonResponses('Change password')
  @Put('change-password')
  async changePassword(
    @CurrentUser() user: User,
    @Body() body: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { current_password, password, confirm_password } = body;
    const result = await this.authService.changePassword(
      user,
      current_password,
      password,
      confirm_password,
    );
    return {
      ...result,
      message: 'SUCCESS.UPDATED',
    };
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiCommonResponses('Start Google login')
  // Guard AuthGuard('google') sẽ redirect sang Google; body không bao giờ chạy
  async googleAuth(): Promise<void> {}

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiCommonResponses('Handle Google login callback')
  async googleAuthCallback(@Request() req: ExpressRequest) {
    const result = await this.authService.googleLogin(
      req.user as { email: string; name: string; googleId: string },
    );
    return {
      ...result,
      message: 'AUTH.LOGIN_SUCCESS',
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('resend-verification-email')
  @ApiCommonResponses('Resend verification email')
  async resendVerificationEmail(@Body() body: ResendVerificationEmailDto) {
    const result = await this.authService.resendVerificationEmail(body.email);
    return {
      ...result,
      message: 'SUCCESS.UPDATED',
    };
  }
}
