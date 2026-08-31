import {
  Body,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Request } from 'express';

import { ApiCommonResponses } from '@/shared/decorators/api-common-responses.decorator';
import { AuthenticatedController } from '@/shared/decorators/authenticated-controller.decorator';
import { CurrentUserId } from '@/shared/decorators/current-user.decorator';
import { Public } from '@/shared/decorators/public.decorator';
import { ResponseMessage } from '@/shared/decorators/response-message.decorator';

import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResendVerificationEmailDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { PasswordService } from './services/password.service';
import { RegistrationService } from './services/registration.service';
import { TokenService } from './services/token.service';
import { AuthResult, AuthTokens, GoogleProfile } from './types/auth.types';

/** Rate limit cho các route auth nhạy cảm. */
const THROTTLE_STRICT = { default: { limit: 5, ttl: 60_000 } };
const THROTTLE_TOKEN = { default: { limit: 10, ttl: 60_000 } };
const THROTTLE_EMAIL = { default: { limit: 3, ttl: 300_000 } };

@ApiTags('Authentication')
@AuthenticatedController('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly registrationService: RegistrationService,
    private readonly passwordService: PasswordService,
  ) {}

  // --- Đăng ký & xác thực email ---------------------------------------------

  @Public()
  @Throttle(THROTTLE_STRICT)
  @Post('register')
  @ApiCommonResponses('Register account')
  @ResponseMessage('AUTH.REGISTER_SUCCESS')
  register(@Body() body: RegisterDto): Promise<void> {
    return this.registrationService.register(body);
  }

  @Public()
  @Throttle(THROTTLE_EMAIL)
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiCommonResponses('Verify email')
  @ResponseMessage('SUCCESS.UPDATED')
  verifyEmail(@Body() body: VerifyEmailDto): Promise<void> {
    return this.registrationService.verifyEmail(
      body.email,
      body.verificationCode,
    );
  }

  // Rate limit chặt: 3 lần / 5 phút — tránh spam email và brute-force mã.
  @Public()
  @Throttle(THROTTLE_EMAIL)
  @Post('resend-verification-email')
  @HttpCode(HttpStatus.OK)
  @ApiCommonResponses('Resend verification email')
  @ResponseMessage('SUCCESS.UPDATED')
  resendVerificationEmail(
    @Body() body: ResendVerificationEmailDto,
  ): Promise<void> {
    return this.registrationService.resendVerificationEmail(body.email);
  }

  // --- Đăng nhập & token ----------------------------------------------------

  // Chống brute-force mật khẩu: tối đa 5 request / 60s cho mỗi IP.
  @Public()
  @Throttle(THROTTLE_STRICT)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiCommonResponses('Login')
  @ResponseMessage('AUTH.LOGIN_SUCCESS')
  login(@Body() body: LoginDto): Promise<AuthResult> {
    return this.authService.login(body);
  }

  // Chống abuse/token-guessing: siết như các route auth nhạy cảm khác.
  @Public()
  @Throttle(THROTTLE_TOKEN)
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiCommonResponses('Refresh token (rotation)')
  refreshToken(@Body() body: RefreshTokenDto): Promise<AuthTokens> {
    return this.tokenService.refreshToken(body);
  }

  @Public()
  @Throttle(THROTTLE_TOKEN)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiCommonResponses('Logout (thu hồi refresh token)')
  @ResponseMessage('Logged out successfully')
  logout(@Body() body: RefreshTokenDto): Promise<void> {
    return this.tokenService.logout(body.refreshToken);
  }

  // --- Mật khẩu -------------------------------------------------------------

  @Public()
  @Throttle(THROTTLE_STRICT)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiCommonResponses('Forgot password')
  @ResponseMessage('SUCCESS.UPDATED')
  forgotPassword(@Body() body: ForgotPasswordDto): Promise<void> {
    return this.passwordService.forgotPassword(body);
  }

  @Public()
  @Throttle(THROTTLE_STRICT)
  @Put('reset-password')
  @ApiCommonResponses('Reset password (dùng token từ email)')
  @ResponseMessage('SUCCESS.UPDATED')
  resetPassword(@Body() body: ResetPasswordDto): Promise<void> {
    return this.passwordService.resetPassword(
      body.token,
      body.newPassword,
      body.confirm_password,
    );
  }

  @Put('change-password')
  @ApiCommonResponses('Change password')
  @ResponseMessage('SUCCESS.UPDATED')
  changePassword(
    @CurrentUserId() userId: string,
    @Body() body: ChangePasswordDto,
  ): Promise<void> {
    return this.passwordService.changePassword(
      userId,
      body.current_password,
      body.password,
      body.confirm_password,
    );
  }

  // --- Google OAuth ---------------------------------------------------------

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiCommonResponses('Start Google login')
  googleAuth(): void {
    // Guard của Passport lo việc redirect sang Google.
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiCommonResponses('Handle Google login callback')
  @ResponseMessage('AUTH.LOGIN_SUCCESS')
  googleAuthCallback(@Req() req: Request): Promise<AuthResult> {
    return this.authService.googleLogin(req.user as unknown as GoogleProfile);
  }
}
