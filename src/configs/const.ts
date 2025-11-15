export const USER_FIELDS = {
  id: true,
  email: true,
  name: true,
  avatar: true,
  role: true,
} as const;

export const IMAGE_FOLDER = 'images';
export const SORT_BY_CREATE_AT = 'createAt';

export const USER_SELECT = {
  id: true,
  email: true,
  phone: true,
  address: true,
  avatar: true,
  name: true,
  date_of_birth: true,
  country: true,
  createAt: true,
  updateAt: true,
  verificationCode: true,
  verificationCodeExpiresAt: true,
  isVerified: true,
  role: {
    select: {
      name: true,
    },
  },
} as const;
