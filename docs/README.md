# 📚 Tài liệu dự án (NestJS Boilerplate)

Bộ tài liệu này là **nguồn tham chiếu chuẩn** cho cả con người lẫn AI khi làm việc trên dự án.
Trước khi viết hoặc sửa code, hãy đọc [CODING_STANDARDS.md](./CODING_STANDARDS.md) — đó là quy ước bắt buộc.

## Mục lục

| File | Nội dung | Đọc khi nào |
|---|---|---|
| [CODING_STANDARDS.md](./CODING_STANDARDS.md) | **Tiêu chuẩn code bắt buộc** — quy ước, pattern, do/don't | Trước mọi thay đổi code |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Kiến trúc hiện tại: 4 tầng, luồng request, hợp đồng response | Khi cần hiểu tổng thể |
| [DIAGRAMS.md](./DIAGRAMS.md) | **Sơ đồ**: bản đồ 4 tầng, vòng đời request, trace endpoint thật, nhánh lỗi, WebSocket | Khi cần nhìn tổng thể trong 2 phút |
| [ARCHITECTURE_OPTIMIZATION.md](./ARCHITECTURE_OPTIMIZATION.md) | Vì sao kiến trúc thành ra như vậy (phân tích + lộ trình đã làm) | Khi thắc mắc "sao lại thiết kế thế này" |
| [BUILD.md](./BUILD.md) | Cách cài đặt, chạy dev, test, migrate, build, Docker | Khi setup/deploy |
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | Các thành phần đã hiện thực và cách dùng lại | Khi thêm tính năng |
| [CODE_REVIEW.md](./CODE_REVIEW.md) | Checklist review + tiêu chí chấp nhận PR | Khi review/tự kiểm |
| [ROADMAP.md](./ROADMAP.md) | Việc còn lại (P1/P2) đã thống nhất | Khi lên kế hoạch |

## Nguyên tắc vàng (TL;DR cho AI)

1. **Không đọc `process.env` trong service/guard** → luôn qua `ConfigService` + config namespaced.
2. **Không tự format lỗi/response trong controller** → ném exception của NestJS; `AllExceptionsFilter` + `TransformInterceptor` lo phần còn lại.
3. **Route mặc định đã được bảo vệ** bằng global `JwtAuthGuard`. Muốn public thì gắn `@Public()`; muốn giới hạn role thì gắn `@Roles()`.
4. **Mọi input phải có DTO + class-validator.**
5. **Không lộ trường nhạy cảm** (`password`, token…) — entity phải đi qua `*.mapper.ts` (whitelist) và/hoặc Prisma `select`.
6. **Tôn trọng ranh giới tầng**: `core/`, `shared/`, `integrations/` không được import `modules/` (ESLint chặn).
7. **Mỗi bảng có một repository sở hữu** — module khác dùng qua `exports` của module đó.
8. Tạo module mới bằng `pnpm gen <ten>`, đừng copy-paste module cũ.
9. Chạy `pnpm typecheck && pnpm build && pnpm lint && pnpm test` trước khi coi là xong.
