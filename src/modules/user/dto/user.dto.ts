import { ApiProperty } from '@nestjs/swagger';

import { User } from '@prisma/client';

import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  Matches,
  MinLength,
} from 'class-validator';

import { PaginationResponse } from '@app/src/core/model/pagination-response';

export class CreateUserDto {
  @IsNotEmpty()
  name: string;

  @Matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/)
  phone: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  status: number;
}

export class UpdateUserDto {
  @ApiProperty()
  @IsOptional()
  name?: string;

  @ApiProperty()
  @IsOptional()
  address?: string;

  @ApiProperty({ type: String, format: 'date-time', required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date_of_birth?: Date;

  @ApiProperty()
  @IsOptional()
  country?: string;

  @ApiProperty()
  @IsOptional()
  @Matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/)
  phone?: string;

  @IsOptional()
  roleId?: string;
}

export class UpdateUserRoleDto {
  @ApiProperty()
  @IsNotEmpty()
  roleId: string;
}

export type UserPaginationResponse = PaginationResponse<User[]>;
