/** Password must contain at least one uppercase letter and one number. */
export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).+$/;

export const PASSWORD_VALIDATION_MESSAGE =
  'Password must contain at least one uppercase letter and one number';
