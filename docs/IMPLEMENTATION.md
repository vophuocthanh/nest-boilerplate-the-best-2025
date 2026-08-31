# 🧩 Hiện thực & Cách dùng lại

Tài liệu các thành phần hạ tầng đã có, kèm **cách dùng lại** khi viết tính năng mới.
Mục tiêu: AI/dev không phát minh lại — luôn tái sử dụng pattern dưới đây.

---

## 1. Chuẩn hoá Response — `TransformInterceptor`
📁 [core/interceptors/transform.interceptor.ts](../src/core/interceptors/transform.interceptor.ts) · đăng ký global tại [core.module.ts](../src/core/core.module.ts).

Đây là **nơi duy nhất** tạo envelope. Service/controller không được tự bọc.

```jsonc
{ "statusCode": 200, "message": "Success", "data": <payload>, "meta?": { ... } }
```

Chỉ có hai nhánh, không heuristic:

| Controller trả về | Kết quả |
|---|---|
| Dữ liệu thô (DTO, mảng, `void`) | `data` = giá trị đó (hoặc `null`) |
| `Paginated<T>` = `{ items, meta }` | `data` = `items`, `meta` = `meta` |

- Message tuỳ biến → **`@ResponseMessage('AUTH.LOGIN_SUCCESS')`**.
- Cần giữ nguyên payload gốc → **`@SkipTransform()`** (vd health-check của Terminus).

---

## 2. Chuẩn hoá Lỗi — `AllExceptionsFilter`
📁 [core/filters/all-exceptions.filter.ts](../src/core/filters/all-exceptions.filter.ts) · global.

- Bắt `HttpException`, lỗi Prisma (P2002 → 409, P2025 → 404, P2003/P2014 → 400,
  `PrismaClientValidationError` → 400, `PrismaClientInitializationError` → 503) và lỗi
  không lường trước (→ 500).
- Output: `{ statusCode, message, error, timestamp, path, requestId }`.
- Lỗi validation đi qua `validationExceptionFactory` → `{ message: { field: '...' } }`.

**Cách dùng:** chỉ cần `throw` exception, không tự xử lý.

---

## 3. Auth & Phân quyền

| Thành phần | File | Dùng để |
|---|---|---|
| `JwtStrategy` | [modules/auth/strategies/jwt.strategy.ts](../src/modules/auth/strategies/jwt.strategy.ts) | Validate access token |
| `JwtAuthGuard` (global) | [core/guards/jwt-auth.guard.ts](../src/core/guards/jwt-auth.guard.ts) | Bảo vệ mọi route mặc định |
| `RolesGuard` (global) | [core/guards/roles.guard.ts](../src/core/guards/roles.guard.ts) | Thực thi `@Roles()` |
| `@Public()` | [shared/decorators/public.decorator.ts](../src/shared/decorators/public.decorator.ts) | Mở route công khai |
| `@Roles('ADMIN')` | [shared/decorators/roles.decorator.ts](../src/shared/decorators/roles.decorator.ts) | Giới hạn theo vai trò |
| `@CurrentUserId()` / `@CurrentUser()` | [shared/decorators/current-user.decorator.ts](../src/shared/decorators/current-user.decorator.ts) | Lấy id / payload JWT |
| `@AuthenticatedController('path')` | [shared/decorators/authenticated-controller.decorator.ts](../src/shared/decorators/authenticated-controller.decorator.ts) | `@Controller` + `@ApiBearerAuth` |
| `JwtCoreModule` | [core/jwt/jwt-core.module.ts](../src/core/jwt/jwt-core.module.ts) | Cấu hình ký JWT — khai báo 1 lần |
| WebSocket auth | [modules/messages/messages.gateway.ts](../src/modules/messages/messages.gateway.ts) | Verify token trong `handleConnection` |

```ts
@Roles('ADMIN')
@Delete(':id')
@ApiCommonResponses('Xoá bản ghi')
@ResponseMessage('Xoá thành công')
remove(@Param('id') id: string, @CurrentUserId() me: string): Promise<void> {
  return this.service.remove(id, me);
}
```

---

## 4. Cấu hình — `ConfigService`
📁 [config/configuration.ts](../src/config/configuration.ts) (namespaced) · [config/env.validation.ts](../src/config/env.validation.ts) (Joi).

**Thêm biến mới:**
1. Khai báo + validate ở `env.validation.ts`.
2. Map vào namespace ở `configuration.ts` (`jwt`, `aws`, `google`, `security`) hoặc tạo
   namespace mới + `load` trong `app.module.ts`.
3. Đọc: `this.configService.get<string>('namespace.key')`.

---

## 5. Phân trang — `@Pagination()` + `paginate()`
📁 [shared/decorators/pagination.decorator.ts](../src/shared/decorators/pagination.decorator.ts) · [shared/pagination/paginate.ts](../src/shared/pagination/paginate.ts).

```ts
// <feature>.constants.ts — whitelist sortBy
export const PRODUCT_SORT_FIELDS = ['createAt', 'updateAt', 'name'] as const;

// <feature>.repository.ts
paginate(params: PaginationParams): Promise<Paginated<Product>> {
  const where: Prisma.ProductWhereInput = params.search
    ? { name: { contains: params.search, mode: 'insensitive' } }
    : {};

  return paginate<Product, Prisma.ProductWhereInput>(this.prisma.product, params, {
    where,
    allowedSortFields: PRODUCT_SORT_FIELDS,  // BẮT BUỘC — chặn sortBy tuỳ ý
    defaultSortField: 'createAt',
  });
}

// <feature>.controller.ts
@Get()
@CommonPagination(PRODUCT_SORT_FIELDS)
getAll(@Pagination() params: PaginationParams): Promise<Paginated<ProductDto>> {
  return this.productService.getAll(params);
}
```

`paginate()` chạy `findMany` + `count` song song, chặn `itemsPerPage` ở 100.

---

## 6. Không rò rỉ dữ liệu — `*.mapper.ts`
📁 [modules/user/user.mapper.ts](../src/modules/user/user.mapper.ts) (mẫu tham chiếu).

Mapper là **whitelist**: liệt kê tường minh field được trả ra. Thêm field nhạy cảm vào
`schema.prisma` sẽ mặc định **không** lộ ra (fail closed).

```ts
export function toUserDto(user: UserWithOptionalRole): UserDto {
  return { id: user.id, email: user.email, name: user.name, /* … */ role: user.role?.name ?? null };
}
```

❌ Không dùng blacklist kiểu `delete obj.password` — chắc chắn sẽ sót khi schema lớn lên.

---

## 7. Bảo mật trong module `auth`

| Pattern | File |
|---|---|
| `hashToken()` — SHA-256 trước khi lưu token vào DB | [auth.crypto.ts](../src/modules/auth/auth.crypto.ts) |
| `safeEqual()` — so sánh constant-time | [auth.crypto.ts](../src/modules/auth/auth.crypto.ts) |
| `PasswordHasher` — bcrypt với cost factor từ config | [password-hasher.service.ts](../src/modules/auth/password-hasher.service.ts) |
| Mã xác thực bằng `crypto.randomInt` (CSPRNG) | [registration.service.ts](../src/modules/auth/services/registration.service.ts) |
| Rotation + revoke + reuse-detection | [token.service.ts](../src/modules/auth/services/token.service.ts) |
| Khoá tài khoản khi brute-force | [auth.service.ts](../src/modules/auth/auth.service.ts) |
| Thông báo chung chống account enumeration | service trả `void`, message ở `@ResponseMessage` |

---

## 8. Tiện ích khác

| Thành phần | File | Ghi chú |
|---|---|---|
| `PrismaService` | [core/database/prisma.service.ts](../src/core/database/prisma.service.ts) | Connect/disconnect theo vòng đời module, `@Global` |
| `StorageService` (port) | [integrations/storage/storage.service.ts](../src/integrations/storage/storage.service.ts) | Inject **class trừu tượng** này, không inject S3 trực tiếp |
| `S3StorageService` (adapter) | [integrations/storage/s3-storage.service.ts](../src/integrations/storage/s3-storage.service.ts) | Đổi sang local/GCS chỉ sửa `storage.module.ts` |
| `MailService` | [integrations/mail/mail.service.ts](../src/integrations/mail/mail.service.ts) | Gửi mail Handlebars, lỗi SMTP không làm hỏng request |
| `@ApiCommonResponses` | [shared/decorators/api-common-responses.decorator.ts](../src/shared/decorators/api-common-responses.decorator.ts) | Gom Swagger response chuẩn |
| `createMock` / `paginationParams` | [test/factories.ts](../src/test/factories.ts) | Tiện ích viết unit test |

---

## 9. Checklist thêm một tính năng mới (CRUD)

1. `prisma/schema.prisma` → thêm model → `pnpm exec prisma migrate dev`.
2. **`pnpm gen <ten>`** — sinh sẵn controller/service/repository/mapper/constants/module/dto
   đúng kiến trúc (đồng thời đăng ký vào `app.module.ts` và thêm model mẫu).
3. Sửa DTO + mapper cho khớp model thật.
4. Repository: mọi truy vấn bảng của aggregate này nằm ở đây, không rải ra service.
5. Controller: `@ApiCommonResponses`, `@ResponseMessage`, `@Roles()`/`@Public()` phù hợp.
6. Viết `*.service.spec.ts` (mock repository bằng `createMock`).
7. `pnpm typecheck && pnpm build && pnpm lint && pnpm test`.
