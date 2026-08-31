import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

/**
 * Khai báo Swagger cho toàn bộ query string mà `@Pagination()` đọc.
 *
 * Gộp luôn `sort`/`sortBy` (trước đây phải gắn thêm `@CommonQuery` thủ công ở
 * từng controller) để tài liệu không bao giờ lệch với thứ decorator thực sự parse.
 */
export function CommonPagination(allowedSortFields?: readonly string[]) {
  return applyDecorators(
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Trang hiện tại (mặc định 1)',
    }),
    ApiQuery({
      name: 'itemsPerPage',
      required: false,
      type: Number,
      description: 'Số bản ghi mỗi trang (mặc định 10, tối đa 100)',
    }),
    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      description: 'Từ khoá tìm kiếm',
    }),
    ApiQuery({
      name: 'sort',
      required: false,
      enum: ['asc', 'desc'],
      description: 'Chiều sắp xếp (mặc định desc)',
    }),
    ApiQuery({
      name: 'sortBy',
      required: false,
      enum: allowedSortFields ? [...allowedSortFields] : undefined,
      description: 'Field dùng để sắp xếp',
    }),
  );
}
