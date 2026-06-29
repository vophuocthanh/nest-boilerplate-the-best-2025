export const IMAGE_FOLDER = 'images';

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
  isVerified: true,
  role: {
    select: {
      name: true,
    },
  },
} as const;
