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

import { User } from '@prisma/client';

import { ApiCommonResponses } from '@app/src/decorator/api-common-responses.decorator';
import { AuthService } from '@app/src/modules/auth/auth.service';
import { CurrentUser } from '@app/src/modules/auth/decorator/current-user.decorator';
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
import { HandleAuthGuard } from '@app/src/modules/auth/guard/auth.guard';

@ApiBearerAuth()
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiCommonResponses('Register account')
  async register(@Body() body: RegisterDto): Promise<{ message: string }> {
    const result = await this.authService.register(body);
    return {
      ...result,
      message: 'AUTH.REGISTER_SUCCESS',
    };
  }

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

  @Post('login')
  @ApiCommonResponses('Login')
  async login(@Body() body: LoginDto): Promise<any> {
    const result = await this.authService.login(body);
    return {
      data: result,
      message: 'AUTH.LOGIN_SUCCESS',
    };
  }

  @Post('refresh-token')
  @ApiCommonResponses('Refresh token')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Post('forgot-password')
  @ApiCommonResponses('Forgot password')
  async forgotPassword(@Body() body: ForgotPasswordDto): Promise<any> {
    const result = await this.authService.forgotPassword(body);
    return {
      ...result,
      message: 'SUCCESS.UPDATED',
    };
  }

  @UseGuards(HandleAuthGuard)
  @Put('reset-password')
  @ApiCommonResponses('Reset password')
  async resetPassword(
    @CurrentUser() user: User,
    @Body() body: ResetPasswordDto,
  ): Promise<any> {
    const { newPassword } = body;
    const result = await this.authService.resetPassword(user, newPassword);
    return {
      ...result,
      message: 'SUCCESS.UPDATED',
    };
  }

  @UseGuards(HandleAuthGuard)
  @ApiCommonResponses('Change password')
  @Put('change-password')
  async changePassword(
    @CurrentUser() user: User,
    @Body() body: ChangePasswordDto,
  ): Promise<any> {
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

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiCommonResponses('Start Google login')
  async googleAuth(@Request() req) {
    return req;
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiCommonResponses('Handle Google login callback')
  async googleAuthCallback(@Request() req) {
    const result = await this.authService.googleLogin(req.user);
    return {
      ...result,
      message: 'AUTH.LOGIN_SUCCESS',
    };
  }

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
