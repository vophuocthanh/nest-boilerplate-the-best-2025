import { ApiProperty } from '@nestjs/swagger';

/** Hình dạng user trả ra client. Không chứa bất kỳ field nhạy cảm nào. */
export class UserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty({ nullable: true })
  address!: string | null;

  @ApiProperty({ nullable: true })
  avatar!: string | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  date_of_birth!: Date | null;

  @ApiProperty({ nullable: true })
  country!: string | null;

  @ApiProperty()
  isVerified!: boolean;

  @ApiProperty({ nullable: true })
  role!: string | null;

  @ApiProperty()
  createAt!: Date;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  updateAt!: Date | null;
}

/** Kết quả đếm user (endpoint dành cho ADMIN). */
export class UserCountDto {
  @ApiProperty()
  total!: number;
}
