/**
 * Port (abstraction) cho việc lưu file.
 *
 * Module nghiệp vụ chỉ được phụ thuộc vào class trừu tượng này, KHÔNG phụ thuộc
 * `S3StorageService`. Nhờ vậy đổi S3 sang local disk / GCS chỉ cần sửa đúng
 * `storage.module.ts`, và unit test mock được mà không đụng tới AWS SDK.
 *
 * Dùng `abstract class` thay vì `interface` để vừa là contract lúc compile,
 * vừa dùng được làm DI token lúc runtime (interface bị xoá khi biên dịch).
 */
export abstract class StorageService {
  /** Upload file và trả về URL công khai. */
  abstract upload(file: Express.Multer.File, folder: string): Promise<string>;
}
