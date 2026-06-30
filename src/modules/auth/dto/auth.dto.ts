import { ApiProperty } from '@nestjs/swagger';

import {
  IsEmail,
  IsNotEmpty,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REGEX,
  PASSWORD_VALIDATION_MESSAGE,
} from '@app/src/modules/auth/constants/password.constant';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'email@gmail.com' })
  @IsEmail()
  email!: string;
}

export class ResendVerificationEmailDto {
  @ApiProperty({ example: 'email@gmail.com' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token reset nhận từ email' })
  @IsNotEmpty()
  token!: string;

  @ApiProperty()
  @IsNotEmpty()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_VALIDATION_MESSAGE })
  newPassword!: string;

  @ApiProperty()
  @IsNotEmpty()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_VALIDATION_MESSAGE })
  confirm_password!: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  @MinLength(6)
  current_password!: string;

  @ApiProperty()
  @IsNotEmpty()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_VALIDATION_MESSAGE })
  password!: string;

  @ApiProperty()
  @IsNotEmpty()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_VALIDATION_MESSAGE })
  confirm_password!: string;
}
