import { Injectable } from '@nestjs/common';

import { Prisma, Role, User } from '@prisma/client';

import { PrismaService } from '@/core/database/prisma.service';
import { paginate } from '@/shared/pagination/paginate';
import { Paginated } from '@/shared/pagination/paginated';
import { PaginationParams } from '@/shared/pagination/pagination-params';

import { USER_SAFE_SELECT, USER_SORT_FIELDS } from './user.constants';

export type UserWithRole = User & { role: Pick<Role, 'name'> | null };

/** Hình dạng user sau khi lọc qua {@link USER_SAFE_SELECT} — suy ra từ Prisma. */
export type SafeUserRow = Prisma.UserGetPayload<{
  select: typeof USER_SAFE_SELECT;
}>;

/**
 * Nơi DUY NHẤT truy vấn bảng `users`.
 *
 * Trước đây 6 file thuộc 3 module (`auth`, `user`, `messages`) cùng gọi thẳng
 * `prisma.user.*`, nên một thay đổi kiểu soft-delete hay audit log phải sửa rải
 * rác và rất dễ sót. Các module khác giờ đi qua repository này (`UserModule`
 * export nó), nên phụ thuộc trở nên hiện rõ trong graph của Nest.
 */
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- Đọc ------------------------------------------------------------------

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByEmailWithRole(email: string): Promise<UserWithRole | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  findByIdWithRole(id: string): Promise<UserWithRole | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  findByGoogleIdWithRole(googleId: string): Promise<UserWithRole | null> {
    return this.prisma.user.findFirst({
      where: { googleId },
      include: { role: true },
    });
  }

  findByResetTokenHash(resetTokenHash: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { resetToken: resetTokenHash },
    });
  }

  /** Chỉ lấy password hash — dùng khi đổi mật khẩu, tránh kéo cả bản ghi. */
  findPasswordById(id: string): Promise<{ password: string | null } | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: { password: true },
    });
  }

  async exists(id: string): Promise<boolean> {
    const found = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    return found !== null;
  }

  count(): Promise<number> {
    return this.prisma.user.count();
  }

  paginate(params: PaginationParams): Promise<Paginated<SafeUserRow>> {
    const where: Prisma.UserWhereInput = params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { email: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {};

    return paginate<SafeUserRow, Prisma.UserWhereInput>(
      this.prisma.user,
      params,
      {
        where,
        select: USER_SAFE_SELECT,
        allowedSortFields: USER_SORT_FIELDS,
        defaultSortField: 'createAt',
      },
    );
  }

  // --- Ghi ------------------------------------------------------------------

  createUnverified(data: {
    email: string;
    name: string;
    passwordHash: string;
    verificationCodeHash: string;
    verificationCodeExpiresAt: Date;
    roleId: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: data.passwordHash,
        verificationCode: data.verificationCodeHash,
        verificationCodeExpiresAt: data.verificationCodeExpiresAt,
        isVerified: false,
        role: { connect: { id: data.roleId } },
      },
    });
  }

  createFromGoogle(data: {
    email: string;
    name: string;
    googleId: string;
    roleId: string;
  }): Promise<UserWithRole> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        googleId: data.googleId,
        isVerified: true,
        role: { connect: { id: data.roleId } },
      },
      include: { role: true },
    });
  }

  linkGoogleAccount(id: string, googleId: string): Promise<UserWithRole> {
    return this.prisma.user.update({
      where: { id },
      data: { googleId },
      include: { role: true },
    });
  }

  updateProfile(
    id: string,
    data: Pick<
      Prisma.UserUpdateInput,
      'name' | 'address' | 'country' | 'phone' | 'date_of_birth'
    >,
  ): Promise<UserWithRole> {
    return this.prisma.user.update({
      where: { id },
      data,
      include: { role: true },
    });
  }

  updateRole(id: string, roleId: string): Promise<UserWithRole> {
    return this.prisma.user.update({
      where: { id },
      data: { roleId },
      include: { role: true },
    });
  }

  updateAvatar(id: string, avatar: string): Promise<UserWithRole> {
    return this.prisma.user.update({
      where: { id },
      data: { avatar },
      include: { role: true },
    });
  }

  delete(id: string): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }

  // --- Xác thực & bảo mật ---------------------------------------------------

  setVerificationCode(
    id: string,
    verificationCodeHash: string,
    expiresAt: Date,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        verificationCode: verificationCodeHash,
        verificationCodeExpiresAt: expiresAt,
      },
    });
  }

  markVerified(email: string): Promise<User> {
    return this.prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        verificationCode: null,
        verificationCodeExpiresAt: null,
      },
    });
  }

  setResetToken(
    id: string,
    resetTokenHash: string,
    expiresAt: Date,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { resetToken: resetTokenHash, resetTokenExpiresAt: expiresAt },
    });
  }

  updatePassword(id: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { password: passwordHash },
    });
  }

  /** Đặt lại mật khẩu và vô hiệu hoá reset token (dùng một lần). */
  updatePasswordAndClearResetToken(
    id: string,
    passwordHash: string,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        password: passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });
  }

  recordFailedLogin(id: string, attempts: number): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: attempts },
    });
  }

  /** Khoá tài khoản tới `lockedUntil` và reset bộ đếm. */
  lockAccount(id: string, lockedUntil: Date): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: 0, lockedUntil },
    });
  }

  clearLoginFailures(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }
}
