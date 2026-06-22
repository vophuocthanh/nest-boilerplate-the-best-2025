# 🏛️ Kiến trúc & Phân tích

## 1. Tổng quan

API backend xây trên **NestJS 10 + Prisma 5 (PostgreSQL)**, kiến trúc module hoá theo tính năng.
Stack chính:

| Lớp | Công nghệ |
|---|---|
| Framework | NestJS 10 (Express platform) |
| ORM / DB | Prisma 5 / PostgreSQL |
| Auth | Passport JWT (access + refresh rotation), Google OAuth |
| Validation | class-validator + ValidationPipe global |
| Realtime | Socket.IO Gateway (chat) |
| Tài liệu API | Swagger (`/api`) |
| Bảo mật | Helmet, CORS theo env, Throttler (rate limit) |
| Hạ tầng | Docker multi-stage, health check (Terminus) |

## 2. Cấu trúc thư mục

```
src/
├── main.ts                  # bootstrap: helmet, CORS, ValidationPipe, Swagger
├── app.module.ts            # root module: ConfigModule, Throttler, global filter/interceptor/guards
├── common/                  # hạ tầng dùng chung (filter, interceptor, guard, decorator, pipe)
├── configs/                 # configuration (namespaced), env.validation (Joi), swagger
├── core/model/              # model dùng chung (pagination)
├── decorator/               # decorator API/pagination/roles
├── guard/                   # RolesGuard (global)
├── helpers/                 # PrismaService + PrismaModule
├── lib/                     # tiện ích (FileUploadService - S3)
├── middlewares/             # logger.middleware (request log)
├── modules/                 # CÁC TÍNH NĂNG
│   ├── auth/                #   đăng ký/đăng nhập/refresh/reset, JwtStrategy
│   ├── user/                #   CRUD user, avatar, phân quyền
│   ├── role/                #   quản lý role
│   ├── mail/                #   gửi email (Handlebars template)
│   ├── upload/              #   upload file S3
│   ├── messages/            #   chat realtime (WebSocket)
│   └── health/              #   health check
├── types/                   # khai báo type toàn cục (express.d.ts)
└── utils/                   # ResponseUtil, date-utils
```

## 3. Luồng xử lý một HTTP request

```
Request
  │
  ├─▶ Helmet + CORS                         (main.ts)
  ├─▶ loggerMiddleware                      (log request/response)
  ├─▶ ThrottlerGuard         ── rate limit theo IP
  ├─▶ JwtAuthGuard           ── xác thực JWT (bỏ qua nếu @Public)
  ├─▶ RolesGuard             ── kiểm tra @Roles
  ├─▶ ValidationPipe         ── validate + transform DTO
  ├─▶ Controller ─▶ Service ─▶ Prisma/DB
  │
  ├─▶ TransformInterceptor   ── bọc { statusCode, message, data, meta }
  └─▶ AllExceptionsFilter    ── nếu có lỗi: chuẩn hoá { statusCode, message, error, timestamp, path }
Response
```

Thứ tự guard được khai báo tại [app.module.ts](../src/app.module.ts): `Throttler → JwtAuth → Roles`.

## 4. Mô hình xác thực

- **Access token** (ngắn hạn) + **Refresh token** (dài hạn), TTL cấu hình qua env.
- Refresh token được **hash SHA-256** trước khi lưu DB (`refresh_tokens`), hỗ trợ **rotation** (mỗi lần refresh thu hồi token cũ, cấp cặp mới) và **revoke** (logout / reset password thu hồi tất cả).
- `JwtStrategy` (passport-jwt) validate access token cho mọi route HTTP qua global guard.
- Reset password: token random 32 bytes, hash + TTL, dùng một lần.

## 5. Mô hình dữ liệu (Prisma)

```
User 1───* RefreshToken          # phiên refresh token (rotation/revoke)
User *───1 Role                  # vai trò (USER/ADMIN)
User 1───* Message (sender)      # chat
User 1───* Message (receiver)
```

Xem chi tiết tại [prisma/schema.prisma](../prisma/schema.prisma). Trường nhạy cảm (`password`, `verificationCode`, `resetToken`) luôn được loại khỏi response.

## 6. Quyết định thiết kế chính

| Quyết định | Lý do |
|---|---|
| Global `JwtAuthGuard` + `@Public()` | An toàn theo mặc định — quên gắn guard không tạo lỗ hổng |
| `TransformInterceptor` + `AllExceptionsFilter` | Hợp đồng response/lỗi nhất quán cho toàn API |
| Config namespaced + `ConfigService` | Tập trung secret, có validate, typed, dễ test |
| Refresh token hash trong DB | Hỗ trợ thu hồi mà không lưu token thô |
| Prisma `select` thay vì lọc tay | Không lộ field nhạy cảm ngay từ tầng query |

## 7. Điểm cần lưu ý vận hành

- **Throttler in-memory** → chưa chính xác khi chạy nhiều instance (cần Redis — xem [ROADMAP.md](./ROADMAP.md)).
- **Gửi mail đồng bộ** trong request → nên chuyển sang queue.
- **Swagger** đang ở path `/api` (trùng prefix) — cân nhắc bảo vệ/đổi path ở production.
- **Template mail** (`templates/`) cần có mặt ở runtime để MailModule hoạt động.
