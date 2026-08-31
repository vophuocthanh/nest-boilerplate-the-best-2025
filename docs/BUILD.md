# 🛠️ Build, Chạy & Triển khai

## 1. Yêu cầu

- Node.js **>= 18** (Docker dùng Node 22)
- **pnpm** 11 (`corepack enable`)
- PostgreSQL (local hoặc cloud, vd Neon)

## 2. Cài đặt

```bash
pnpm install
cp .env.example .env      # điền giá trị thật
pnpm exec prisma generate # sinh Prisma Client
```

### Biến môi trường bắt buộc
Xem [.env.example](../.env.example). Tối thiểu:
```
DATABASE_URL=postgresql://...
ACCESS_TOKEN_KEY=<secret>
REFRESH_TOKEN_KEY=<secret>
```
App **fail-fast** khi thiếu biến bắt buộc (validate bằng Joi tại [env.validation.ts](../src/config/env.validation.ts)).

## 3. Database & Migration

```bash
# Tạo migration mới sau khi sửa prisma/schema.prisma (môi trường dev)
pnpm exec prisma migrate dev --name <ten_migration>

# Áp dụng migration đã có lên DB (production/CI/Docker)
pnpm exec prisma migrate deploy

# Seed role mặc định (USER, ADMIN)
pnpm run seed

# Xem trạng thái migration
pnpm exec prisma migrate status
```

> ⚠️ **Không** sửa schema DB bằng tay hoặc lạm dụng `prisma db push` trên DB chia sẻ — sẽ gây *drift* (lệch giữa migration history và DB thật), khiến `migrate deploy` lỗi. Luôn đi qua migration.

## 4. Chạy ứng dụng

```bash
pnpm run start:dev     # watch mode (dev)
pnpm run start         # chạy thường
pnpm run start:prod    # chạy bản build (dist/main)
```

- API prefix: `/api`
- Swagger UI: `http://localhost:3001/api`
- Health check: `http://localhost:3001/api/health`

## 5. Kiểm thử & chất lượng

```bash
pnpm run build         # nest build (tsc)
pnpm run lint          # eslint --fix
pnpm test              # unit test (jest)
pnpm run test:cov      # coverage
pnpm run test:e2e      # e2e
pnpm run format        # prettier
```

**Trước khi commit/PR**, chạy tối thiểu: `pnpm run build && pnpm run lint && pnpm test`.
(Husky + lint-staged tự chạy eslint/prettier khi commit; commit message theo Conventional Commits.)

## 6. Docker

```bash
# Build image
docker build -t nestjs-boilerplate .

# Chạy (cần truyền env, vd qua --env-file)
docker run --env-file .env -p 3001:3001 nestjs-boilerplate

# Hoặc docker-compose
docker compose up --build
```

Đặc điểm image (xem [Dockerfile](../Dockerfile)):
- Multi-stage, prune devDependencies → image gọn.
- Chạy bằng user `node` (không phải root), `tini` làm init (forward signal → graceful shutdown).
- **Entrypoint tự chạy `prisma migrate deploy`** trước khi start ([docker-entrypoint.sh](../docker-entrypoint.sh)).
- HEALTHCHECK gọi `/api/health`.

## 7. Sinh module mới nhanh

```bash
pnpm run gen   # scripts/generate-module.js
```

## 8. Sự cố thường gặp

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| App không khởi động, báo thiếu biến | Thiếu env bắt buộc → kiểm tra `.env` theo `env.validation.ts` |
| `migrate deploy` lỗi "already exists" | DB bị drift → đối chiếu `migrate status`, cân nhắc `migrate resolve` |
| 401 ở route vừa thêm | Global `JwtAuthGuard` đang bảo vệ → thêm `@Public()` nếu route công khai |
| Lỗi cast `date_of_birth` khi migrate | Dữ liệu cũ là chuỗi rỗng → migration đã NULL hoá trước khi đổi kiểu |
| Mail không gửi | Thiếu config `MAIL_*` hoặc thiếu `templates/` ở runtime |
