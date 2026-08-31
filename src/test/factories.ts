import { HttpException } from '@nestjs/common';

import { PaginationParams } from '@/shared/pagination/pagination-params';

/** Params phân trang mặc định cho test; override từng field khi cần. */
export const paginationParams = (
  overrides: Partial<PaginationParams> = {},
): PaginationParams => ({
  page: 1,
  itemsPerPage: 10,
  skip: 0,
  search: '',
  sort: 'desc',
  ...overrides,
});

/**
 * Tạo mock cho một collaborator, chỉ khai báo những method mà test thực sự dùng.
 *
 * Trả về `jest.Mocked<T>` để gọi thẳng `repo.method.mockResolvedValue(...)`
 * mà không cần non-null assertion ở từng dòng như `jest.Mocked<Partial<T>>`.
 */
export const createMock = <T>(methods: Partial<Record<keyof T, unknown>>) =>
  methods as unknown as jest.Mocked<T>;

/**
 * Khẳng định promise reject với HttpException mà PAYLOAD chứa chuỗi mong đợi.
 *
 * `expect(...).rejects.toThrow('abc')` chỉ so với `error.message`, mà
 * `new BadRequestException({ message: { field: '...' } })` luôn có message là
 * "Bad Request Exception" — nên phải soi vào `getResponse()`.
 */
export const expectHttpError = async (
  promise: Promise<unknown>,
  expectedSubstring: string,
): Promise<void> => {
  await expect(promise).rejects.toThrow(HttpException);
  await promise.catch((error: HttpException) => {
    expect(JSON.stringify(error.getResponse())).toContain(expectedSubstring);
  });
};
