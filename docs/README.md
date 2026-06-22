# 📚 Tài liệu dự án (NestJS Boilerplate)

Bộ tài liệu này là **nguồn tham chiếu chuẩn** cho cả con người lẫn AI khi làm việc trên dự án.
Trước khi viết hoặc sửa code, hãy đọc [CODING_STANDARDS.md](./CODING_STANDARDS.md) — đó là quy ước bắt buộc.

## Mục lục

| File | Nội dung | Đọc khi nào |
|---|---|---|
| [CODING_STANDARDS.md](./CODING_STANDARDS.md) | **Tiêu chuẩn code bắt buộc** — quy ước, pattern, do/don't | Trước mọi thay đổi code |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Phân tích kiến trúc, luồng request, cấu trúc thư mục | Khi cần hiểu tổng thể |
| [BUILD.md](./BUILD.md) | Cách cài đặt, chạy dev, test, migrate, build, Docker | Khi setup/deploy |
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | Các thành phần đã hiện thực và cách dùng lại | Khi thêm tính năng |
| [CODE_REVIEW.md](./CODE_REVIEW.md) | Checklist review + tiêu chí chấp nhận PR | Khi review/tự kiểm |
| [ROADMAP.md](./ROADMAP.md) | Việc còn lại (P1/P2) đã thống nhất | Khi lên kế hoạch |

## Nguyên tắc vàng (TL;DR cho AI)

1. **Không đọc `process.env` trong service/guard** → luôn qua `ConfigService` + config namespaced.
2. **Không tự format lỗi/response trong controller** → ném exception của NestJS; `AllExceptionsFilter` + `TransformInterceptor` lo phần còn lại.
3. **Route mặc định đã được bảo vệ** bằng global `JwtAuthGuard`. Muốn public thì gắn `@Public()`; muốn giới hạn role thì gắn `@Roles()`.
4. **Mọi input phải có DTO + class-validator.**
5. **Không lộ trường nhạy cảm** (`password`, token…) — chọn field bằng Prisma `select` hoặc `ResponseUtil.formatUserResponse`.
6. **Tôn trọng cấu trúc module** `src/modules/<feature>/`.
7. Chạy `pnpm run build && pnpm run lint && pnpm test` trước khi coi là xong.
