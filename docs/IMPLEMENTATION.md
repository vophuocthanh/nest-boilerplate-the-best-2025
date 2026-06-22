# 🧩 Hiện thực & Cách dùng lại

Tài liệu các thành phần hạ tầng đã có, kèm **cách dùng lại** khi viết tính năng mới.
Mục tiêu: AI/dev không phát minh lại — luôn tái sử dụng pattern dưới đây.

---

## 1. Chuẩn hoá Response — `TransformInterceptor`
📁 [src/common/interceptors/transform.interceptor.ts](../src/common/interceptors/transform.interceptor.ts) · đăng ký global tại `app.module.ts`.

Mọi response được bọc thành:
```jsonc
{ "statusCode": 200, "message": "Success", "data": <payload>, "meta?": { ... } }
```

**Controller chỉ cần trả:**
- Dữ liệu thô → `data` = dữ liệu, `message` = `"Success"`.
- `{ data, message }` → message tuỳ biến.
- `ResponseUtil.paginate(...)` → tự tách `total/page/...` vào `meta`.

---

## 2. Chuẩn hoá Lỗi — `AllExceptionsFilter`
📁 [src/common/filters/all-exceptions.filter.ts](../src/common/filters/all-exceptions.filter.ts) · global.

- Bắt `HttpException`, lỗi Prisma (P2002 → 409, P2025 → 404) và lỗi không lường trước (→ 500).
- Output: `{ statusCode, message, error, timestamp, path }`.
- Lỗi validation đi qua `validationExceptionFactory` → `{ message: { field: '...' } }`.

**Cách dùng:** chỉ cần `throw` exception, không tự xử lý.

---

## 3. Auth & Phân quyền

| Thành phần | File | Dùng để |
|---|---|---|
| `JwtStrategy` | [modules/auth/strategies/jwt.strategy.ts](../src/modules/auth/strategies/jwt.strategy.ts) | Validate access token |
| `JwtAuthGuard` (global) | [common/guards/jwt-auth.guard.ts](../src/common/guards/jwt-auth.guard.ts) | Bảo vệ mọi route mặc định |
| `@Public()` | [common/decorators/public.decorator.ts](../src/common/decorators/public.decorator.ts) | Mở route công khai |
| `@Roles()` + `RolesGuard` | [guard/roles.guard.ts](../src/guard/roles.guard.ts) | Giới hạn theo vai trò |
| `@CurrentUserId()` | [decorator/current-user-id.decorator.ts](../src/decorator/current-user-id.decorator.ts) | Lấy id user hiện tại |
| `@CurrentUser()` | [modules/auth/decorator/current-user.decorator.ts](../src/modules/auth/decorator/current-user.decorator.ts) | Lấy payload JWT |
| `WsJwtAuthGuard` | [auth/guards/ws-jwt-auth.guard.ts](../src/auth/guards/ws-jwt-auth.guard.ts) | Xác thực WebSocket |

**Ví dụ endpoint mới (yêu cầu ADMIN):**
```ts
@Roles('ADMIN')
@Delete(':id')
@ApiCommonResponses('Xoá bản ghi')
async remove(@Param('id') id: string, @CurrentUserId() me: string) {
  return this.service.remove(id, me);
}
```

---

## 4. Cấu hình — `ConfigService`
📁 [src/configs/configuration.ts](../src/configs/configuration.ts) (namespaced) · [src/configs/env.validation.ts](../src/configs/env.validation.ts) (Joi).

**Thêm biến mới:**
1. Khai báo + validate ở `env.validation.ts`.
2. Map vào namespace ở `configuration.ts` (`jwt`, `aws`, …) hoặc tạo namespace mới + `load` trong `app.module.ts`.
3. Đọc: `this.configService.get<string>('namespace.key')`.

---

## 5. Phân trang — `@Pagination()` + `ResponseUtil.paginate`
📁 [decorator/pagination.decorator.ts](../src/decorator/pagination.decorator.ts) · [utils/response.util.ts](../src/utils/response.util.ts).

```ts
async getAll(@Pagination(['sortBy']) p: PaginationParams) {
  const { itemsPerPage, skip, search, page, sort, sortBy } = p;
  const where = search ? { name: { contains: search, mode: 'insensitive' } } : {};
  const [items, total] = await Promise.all([
    this.prisma.entity.findMany({ where, skip, take: itemsPerPage, select: SELECT }),
    this.prisma.entity.count({ where }),
  ]);
  return ResponseUtil.paginate(items, total, page, itemsPerPage);
}
```

---

## 6. Bảo mật trong `AuthService`
📁 [modules/auth/auth.service.ts](../src/modules/auth/auth.service.ts).

Pattern tái sử dụng:
- `hashToken()` — hash SHA-256 trước khi lưu token vào DB.
- `generateVerificationCode()` — `crypto.randomInt` (CSPRNG).
- Login & forgot-password trả **thông báo chung** (chống account enumeration).
- Refresh token **rotation + revoke**.

---

## 7. Tiện ích khác

| Thành phần | File | Ghi chú |
|---|---|---|
| `PrismaService` | [helpers/prisma.service.ts](../src/helpers/prisma.service.ts) | Connect/disconnect theo vòng đời module |
| `FileUploadService` | [lib/file-upload.service.ts](../src/lib/file-upload.service.ts) | Upload S3, đọc config qua ConfigService |
| `MailService` | [modules/mail/mail.service.ts](../src/modules/mail/mail.service.ts) | Gửi mail theo template Handlebars |
| `ResponseUtil` | [utils/response.util.ts](../src/utils/response.util.ts) | `paginate`, `success`, `formatUserResponse` |
| `@ApiCommonResponses` | [decorator/api-common-responses.decorator.ts](../src/decorator/api-common-responses.decorator.ts) | Gom Swagger response chuẩn |

---

## 8. Checklist thêm một tính năng mới (CRUD)

1. `prisma/schema.prisma` → thêm model → `migrate dev`.
2. Tạo `src/modules/<feature>/` với `module/controller/service/dto`.
3. Service: dùng `PrismaService`, `select` field cần, phân trang qua `ResponseUtil.paginate`.
4. Controller: DTO + `@ApiCommonResponses`, `@Roles()`/`@Public()` phù hợp.
5. Đăng ký module trong `app.module.ts`.
6. Viết `*.service.spec.ts`.
7. `pnpm run build && pnpm run lint && pnpm test`.
