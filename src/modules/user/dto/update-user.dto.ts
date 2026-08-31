import { ApiProperty } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

const PHONE_REGEX = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ type: String, format: 'date-time', required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date_of_birth?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(PHONE_REGEX, { message: 'Số điện thoại không hợp lệ' })
  phone?: string;
}

export class UpdateUserRoleDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  roleId!: string;
}
