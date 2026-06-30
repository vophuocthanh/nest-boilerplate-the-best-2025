/**
 * Mật khẩu phải có: 1 chữ thường, 1 chữ HOA, 1 chữ số và 1 ký tự đặc biệt.
 * Độ dài tối thiểu được kiểm tra riêng qua @MinLength (8).
 */
export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export const PASSWORD_VALIDATION_MESSAGE =
  'Password must contain at least one lowercase letter, one uppercase letter, one number and one special character';

/** Độ dài tối thiểu của mật khẩu */
export const PASSWORD_MIN_LENGTH = 8;

/** bcrypt cắt mật khẩu ở 72 byte — chặn ở DTO để hành vi rõ ràng */
export const PASSWORD_MAX_LENGTH = 72;
