# 🏛️ Kiến trúc

> Tài liệu này mô tả **hiện trạng** kiến trúc. Lý do đằng sau từng quyết định và
> lộ trình đã thực hiện nằm ở [ARCHITECTURE_OPTIMIZATION.md](./ARCHITECTURE_OPTIMIZATION.md).

## 1. Tổng quan

API backend trên **NestJS 10 + Prisma 5 (PostgreSQL)**, tổ chức theo **Modular Monolith 4 tầng**.

| Lớp | Công nghệ |
|---|---|
| Framework | NestJS 10 (Express platform) |
| ORM / DB | Prisma 5 / PostgreSQL |
| Auth | Passport JWT (access + refresh rotation), Google OAuth |
| Validation | class-validator + ValidationPipe global |
| Realtime | Socket.IO Gateway (chat) |
| Tài liệu API | Swagger (`/docs`, chỉ bật ở dev/test) |
| Bảo mật | Helmet, CORS theo env, Throttler (rate limit) |
| Hạ tầng | Docker multi-stage, health check (Terminus) |

## 2. Bốn tầng — mỗi tầng một câu hỏi để phân loại file

```
src/
├── main.ts                  bootstrap: prefix, versioning, helmet, CORS, body parser, Swagger
├── app.module.ts            nạp config + liệt kê feature module (không còn gì khác)
│
├── config/                  "giá trị này đến từ env?"
│   ├── configuration.ts         config namespaced (jwt/aws/google/security)
│   ├── env.validation.ts        Joi schema — fail-fast lúc khởi động
│   ├── cors.config.ts           origin theo NODE_ENV
│   ├── multer.config.ts         giới hạn size + mime cho upload ảnh
│   └── swagger/                 swagger.config.ts, swagger-theme.ts
│
├── core/                    "chạy 1 lần cho MỌI request?"
│   ├── core.module.ts           gom APP_FILTER / APP_GUARD / APP_INTERCEPTOR + middleware
│   ├── filters/                 AllExceptionsFilter (chuẩn hoá cả lỗi Prisma)
│   ├── interceptors/            TransformInterceptor (NƠI DUY NHẤT tạo envelope)
│   ├── guards/                  JwtAuthGuard, RolesGuard
│   ├── pipes/                   validationExceptionFactory
│   ├── middlewares/             requestId, logger
│   ├── jwt/                     JwtCoreModule — cấu hình ký JWT, khai báo 1 lần
│   └── database/                PrismaService + PrismaModule (@Global)
│
├── shared/                  "tái dùng được, không tự đăng ký gì?"
│   ├── decorators/              @Public @Roles @CurrentUser @Pagination @ResponseMessage …
│   ├── pagination/              PaginationParams, Paginated<T>, paginate()
│   ├── constants/ types/ utils/
│
├── integrations/            "gọi ra ngoài process?"
│   ├── storage/                 StorageService (port) + S3StorageService (adapter)
│   └── mail/                    MailService (SMTP + Handlebars)
│
├── modules/                 "đây là nghiệp vụ?"
│   ├── auth/  user/  role/  messages/  upload/  health/
│
└── test/                    tiện ích dùng chung cho test (createMock, factories)
```

### Quy tắc phụ thuộc — một chiều, được ESLint enforce

```
modules/  ──▶  integrations/  ──▶  config/
   │                                  ▲
   ├──────▶  core/  ──────────────────┤
   │           │                      │
   └──────▶  shared/  ────────────────┘

❌ core/ · shared/ · integrations/  KHÔNG được import modules/
❌ shared/                          KHÔNG được import core/ hay integrations/
❌ Trong modules/: import xuyên tầng/xuyên module phải dùng alias '@/…'
```

Các quy tắc trên được cài đặt tại [.eslintrc.js](../.eslintrc.js) bằng `no-restricted-imports`
(rule lõi của ESLint, không cần plugin/resolver). PR phá ranh giới sẽ **fail CI**.

## 3. Giải phẫu một feature module

```
modules/<feature>/
├── <feature>.controller.ts   route, DTO, Swagger. KHÔNG chứa logic nghiệp vụ
├── <feature>.service.ts      nghiệp vụ. Trả DTO THÔ — không tự bọc envelope
├── <feature>.repository.ts   nơi DUY NHẤT chạm bảng của aggregate này
├── <feature>.mapper.ts       entity -> DTO, WHITELIST field
├── <feature>.constants.ts    whitelist sortBy, hằng số của module
├── <feature>.module.ts       khai báo + `exports` (cửa duy nhất cho module khác)
└── dto/                      create / update / response DTO
```

`pnpm gen <ten>` sinh sẵn đủ bộ này theo đúng convention.

**Chủ sở hữu aggregate** — mỗi bảng chỉ có một repository chạm vào:

| Bảng | Chủ sở hữu | Ai khác dùng |
|---|---|---|
| `users` | `modules/user/user.repository.ts` | `auth`, `messages` — qua `UserModule.exports` |
| `roles` | `modules/role/role.repository.ts` | `auth`, `user` — qua `RoleModule.exports` |
| `refresh_tokens` | `modules/auth/refresh-token.repository.ts` | — |
| `messages` | `modules/messages/messages.service.ts` | — |

## 4. Luồng xử lý một HTTP request

```
Request
  │
  ├─▶ helmet + CORS + body parser              (main.ts)
  ├─▶ requestIdMiddleware → loggerMiddleware   (CoreModule.configure)
  ├─▶ ThrottlerGuard        ── rate limit theo IP
  ├─▶ JwtAuthGuard          ── xác thực JWT (bỏ qua nếu @Public)
  ├─▶ RolesGuard            ── kiểm tra @Roles
  ├─▶ ValidationPipe        ── validate + transform DTO
  │
  ├─▶ Controller ─▶ Service ─▶ Repository ─▶ Prisma
  │                    └────▶ Mapper (entity -> DTO)
  │
  ├─▶ TransformInterceptor  ── bọc { statusCode, message, data, meta? }
  └─▶ AllExceptionsFilter   ── nếu lỗi: { statusCode, message, error, timestamp, path, requestId }
Response
```

Thứ tự guard khai báo tại [core.module.ts](../src/core/core.module.ts): `Throttler → JwtAuth → Roles`.

## 5. Hợp đồng response

**Thành công** — envelope do `TransformInterceptor` tạo, service không tự bọc:

```jsonc
{ "statusCode": 200, "message": "Success", "data": { } }

// route phân trang (service trả Paginated<T> = { items, meta })
{ "statusCode": 200, "message": "Success", "data": [ ],
  "meta": { "total": 42, "page": 1, "pageSize": 10, "totalPages": 5 } }
```

- `message` khai báo bằng `@ResponseMessage('…')`; mặc định `'Success'`.
- `@SkipTransform()` để giữ nguyên payload gốc (vd health-check của Terminus).

**Lỗi** — do `AllExceptionsFilter` chuẩn hoá, kể cả mã lỗi Prisma (P2002 → 409, P2025 → 404, …):

```jsonc
{ "statusCode": 400, "message": { "email": "Email không hợp lệ" },
  "error": "Bad Request", "timestamp": "…", "path": "/api/…", "requestId": "…" }
```

## 6. Mô hình xác thực

- **Access token** (ngắn hạn) + **Refresh token** (dài hạn), TTL cấu hình qua env.
- Refresh token **hash SHA-256** trước khi lưu DB, hỗ trợ **rotation** (mỗi lần refresh
  thu hồi token cũ) và **reuse-detection** (token đã thu hồi bị dùng lại → thu hồi toàn bộ phiên).
- Chống brute-force: khoá tài khoản tạm thời sau N lần sai (`MAX_FAILED_LOGIN_ATTEMPTS`).
- Reset password: token random 32 bytes, hash + TTL, dùng một lần, thu hồi mọi phiên sau khi đổi.
- Mã xác thực email cũng được hash trước khi lưu; so sánh constant-time.
- `TokenCleanupService` dọn refresh token hết hạn/đã thu hồi lúc 3h sáng mỗi ngày.

## 7. Mô hình dữ liệu (Prisma)

```
User 1───* RefreshToken          # phiên refresh token (rotation/revoke)
User *───1 Role                  # vai trò (USER/ADMIN)
User 1───* Message (sender)      # chat
User 1───* Message (receiver)
```

Chi tiết tại [prisma/schema.prisma](../prisma/schema.prisma).

## 8. Quyết định thiết kế chính

| Quyết định | Lý do |
|---|---|
| Global `JwtAuthGuard` + `@Public()` | An toàn theo mặc định — quên gắn guard không tạo lỗ hổng |
| Envelope chỉ tạo ở `TransformInterceptor` | Một concern, một nơi; service trả dữ liệu thô nên test dễ |
| Mapper **whitelist** (`toUserDto`) | Thêm field nhạy cảm vào schema mặc định KHÔNG lộ ra (fail closed) |
| Một repository cho mỗi aggregate | Thêm soft-delete/audit chỉ sửa một file, không sót |
| `StorageService` là abstract class | Đổi S3 → local/GCS chỉ sửa `storage.module.ts`; test mock được |
| `allowedSortFields` bắt buộc ở `paginate()` | Compiler ép phải chặn `sortBy` từ query string |
| Config namespaced + Joi validate | Tập trung secret, fail-fast lúc boot, typed |
| Ranh giới tầng bằng ESLint | Tài liệu bị quên, lint rule thì không |

## 9. Điểm cần lưu ý vận hành

- **Throttler in-memory** → chưa chính xác khi chạy nhiều instance (cần Redis).
- **Gửi mail đồng bộ** trong request → nên chuyển sang queue.
- **Template mail** (`templates/mail/`) cần có mặt ở runtime để MailModule hoạt động.
- **Encapsulation giữa các module** (chỉ import qua `exports` của module khác) hiện là
  quy ước review, chưa enforce được bằng lint — cần import resolver hiểu alias, mà nó
  kéo theo native build phải approve. Alias `@/modules/…` giúp phát hiện bằng mắt dễ hơn.
