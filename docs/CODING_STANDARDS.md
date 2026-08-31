# 📐 Tiêu chuẩn Code (BẮT BUỘC)

> Đây là quy ước **bắt buộc** cho mọi thay đổi trong repo này — con người và AI đều phải theo.
> Mỗi quy tắc kèm ví dụ ✅ Nên / ❌ Tránh. Khi nghi ngờ, theo pattern đã có trong codebase.

---

## 1. Cấu trúc & tổ chức

### 1.1 Cấu trúc một module tính năng
Mọi tính năng nằm trong `src/modules/<feature>/` và có đủ 5 vai trò:

```
src/modules/<feature>/
├── <feature>.module.ts        # khai báo module + `exports` (cửa duy nhất cho module khác)
├── <feature>.controller.ts    # routing + Swagger, KHÔNG chứa business logic
├── <feature>.service.ts       # business logic, trả DTO THÔ
├── <feature>.repository.ts    # nơi DUY NHẤT chạm bảng của aggregate này
├── <feature>.mapper.ts        # entity -> DTO, WHITELIST field
├── <feature>.constants.ts     # whitelist sortBy, hằng số của module
├── <feature>.service.spec.ts  # unit test
└── dto/                       # create / update / response DTO (class-validator)
```

> `pnpm gen <ten>` sinh sẵn đủ bộ này. Dùng nó thay vì copy-paste module cũ.

### 1.2 Bốn tầng và quy tắc phụ thuộc

```
src/
├── config/         "giá trị này đến từ env?"          configuration, env.validation, cors, multer, swagger
├── core/           "chạy 1 lần cho MỌI request?"      filters, interceptors, guards, pipes, middlewares, jwt, database
├── shared/         "tái dùng được, không đăng ký gì?" decorators, pagination, constants, types
├── integrations/   "gọi ra ngoài process?"            storage (S3), mail (SMTP)
└── modules/        "đây là nghiệp vụ?"                auth, user, role, messages, upload, health
```

```
modules/  ──▶  integrations/  ──▶  config/
   │                                  ▲
   ├──────▶  core/  ──────────────────┤
   └──────▶  shared/  ────────────────┘
```

❌ `core/`, `shared/`, `integrations/` **không được** import `modules/`.
❌ `shared/` **không được** import `core/` hay `integrations/`.

Các quy tắc này được **ESLint enforce** (`no-restricted-imports` trong [.eslintrc.js](../.eslintrc.js)) — vi phạm sẽ fail CI.

### 1.3 Quy ước import path
- Import **xuyên tầng hoặc xuyên module** → alias **`@/…`** (`@/core/…`, `@/shared/…`, `@/modules/user/…`).
- Import **trong cùng module** → tương đối `./…`.
- `@app/…` là alias cũ, còn giữ để tương thích — **không dùng cho code mới**.
- Thứ tự import sắp tự động bằng `@trivago/prettier-plugin-sort-imports`. **Không sắp tay**, chạy `pnpm format`.

✅ Nên
```ts
import { PrismaService } from '@/core/database/prisma.service';   // xuyên tầng
import { UserRepository } from '@/modules/user/user.repository';  // xuyên module
import { toUserDto } from './user.mapper';                        // cùng module
```
❌ Tránh
```ts
import { PrismaService } from '../../../core/database/prisma.service'; // ESLint chặn
```

---

## 2. Controller

- Controller chỉ: nhận request → gọi service → trả kết quả. **Không** chứa business logic, **không** try/catch để format lỗi.
- Mỗi endpoint có `@ApiCommonResponses('mô tả')` (Swagger) và DTO cho `@Body()`/`@Query()`.
- **Không tự bọc** `{ statusCode, ... }` — `TransformInterceptor` lo. Controller/service chỉ trả:
  - **dữ liệu thô** (DTO, mảng, `void`), hoặc
  - **`Paginated<T>`** (`{ items, meta }`) cho danh sách phân trang.
- Message tuỳ biến khai báo bằng **`@ResponseMessage('…')`**, không nhét vào payload.

✅ Nên
```ts
@Public()
@Post('login')
@HttpCode(HttpStatus.OK)
@ApiCommonResponses('Login')
@ResponseMessage('AUTH.LOGIN_SUCCESS')
login(@Body() body: LoginDto): Promise<AuthResult> {
  return this.authService.login(body);
}
```
❌ Tránh
```ts
async login(@Body() body: LoginDto) {
  const result = await this.authService.login(body);
  return { data: result, message: 'AUTH.LOGIN_SUCCESS' }; // tự bọc envelope
}
```
❌ Tránh
```ts
async login(@Body() body: LoginDto, @Res() res) {
  try {
    return res.status(200).json({ statusCode: 200, data: ... }); // tự bọc + tự format
  } catch (e) {
    return res.status(400).json({ error: e.message });           // tự bắt lỗi
  }
}
```

---

## 3. Xác thực & phân quyền (Auth)

- **Global `JwtAuthGuard`** đã bảo vệ MỌI route theo mặc định (đăng ký ở [core.module.ts](../src/core/core.module.ts)).
- Route công khai → gắn **`@Public()`** ([shared/decorators/public.decorator.ts](../src/shared/decorators/public.decorator.ts)).
- Giới hạn theo vai trò → gắn **`@Roles('ADMIN')`** (global `RolesGuard` xử lý).
- Lấy thông tin user đã xác thực:
  - `@CurrentUserId() userId: string`
  - `@CurrentUser() user: AuthenticatedUser` (payload JWT)
- **WebSocket** tự verify token trong `MessagesGateway.handleConnection` (token qua `handshake.auth.token`).

✅ Nên
```ts
@Roles('ADMIN')
@Delete(':id')
async deleteUser(@Param('id') id: string, @CurrentUserId() me: string) { ... }
```
❌ Tránh — tự verify JWT trong controller/guard thủ công, tự đọc header `Authorization`.

---

## 4. Cấu hình & biến môi trường

- **Tuyệt đối không** đọc `process.env` trong service/guard/gateway.
- Thêm biến mới: khai báo schema ở [config/env.validation.ts](../src/config/env.validation.ts) (Joi, fail-fast) **và** map vào namespace ở [config/configuration.ts](../src/config/configuration.ts).
- Đọc qua `ConfigService.get('namespace.key')`.

✅ Nên
```ts
constructor(private configService: ConfigService) {}
const secret = this.configService.get<string>('jwt.accessSecret');
```
❌ Tránh
```ts
const secret = process.env.ACCESS_TOKEN_KEY; // không validate, không type
```

> Ngoại lệ duy nhất: `main.ts` (bootstrap, trước khi có DI), `app.controller.ts` và 2 file config ở trên.

---

## 5. Xử lý lỗi

- Ném exception chuẩn của NestJS — **không** trả lỗi thủ công.
- Lỗi field-level dùng dạng `{ message: { field: 'thông báo' } }`.
- `AllExceptionsFilter` ([core/filters](../src/core/filters/all-exceptions.filter.ts)) chuẩn hoá toàn bộ (kể cả mã lỗi Prisma) → `{ statusCode, message, error, timestamp, path, requestId }`.

✅ Nên
```ts
throw new BadRequestException({ message: { email: 'Email đã tồn tại' } });
throw new NotFoundException('User not found');
```
❌ Tránh — `return { error: '...' }`, `res.status(400)...`, hoặc nuốt lỗi (`catch {}`).

---

## 6. DTO & Validation

- Mỗi input có một class DTO với decorator `class-validator` + `@ApiProperty()` cho Swagger.
- `ValidationPipe` global đã bật `whitelist`, `forbidNonWhitelisted`, `transform`. Field không khai báo sẽ bị loại/ chặn.
- Ngày giờ: dùng `@Type(() => Date) @IsDate()` (khớp kiểu `DateTime` của Prisma).

✅ Nên
```ts
export class RegisterDto {
  @ApiProperty() @IsEmail() email: string;

  @ApiProperty() @IsNotEmpty() @MinLength(6)
  @Matches(/^(?=.*[A-Z])(?=.*\d).+$/, { message: 'Cần 1 chữ hoa và 1 số' })
  password: string;
}
```

---

## 7. Tầng dữ liệu (Prisma)

- Truy cập DB **chỉ qua repository của module sở hữu aggregate đó**. Service không gọi `PrismaService` trực tiếp cho bảng mà module khác sở hữu.
- Module khác cần dữ liệu → `imports: [ThatModule]` rồi inject repository mà module đó `exports`.
- **Không bao giờ** trả thẳng entity ra client. Đi qua `*.mapper.ts` (whitelist) và/hoặc Prisma `select`.
- Danh sách phân trang dùng helper `paginate()` — nó chạy `findMany` + `count` song song và **bắt buộc** khai báo `allowedSortFields`.
- Thay đổi schema → tạo migration (`prisma migrate dev`), không sửa DB tay (tránh drift). Xem [BUILD.md](./BUILD.md).

✅ Nên
```ts
// user.repository.ts — nơi DUY NHẤT chạm bảng `users`
paginate(params: PaginationParams): Promise<Paginated<SafeUserRow>> {
  return paginate<SafeUserRow, Prisma.UserWhereInput>(this.prisma.user, params, {
    where,
    select: USER_SAFE_SELECT,
    allowedSortFields: USER_SORT_FIELDS,  // chặn sortBy tuỳ ý từ query string
    defaultSortField: 'createAt',
  });
}
```
❌ Tránh
```ts
return this.prisma.user.findMany();                       // lộ password/token, không phân trang
orderBy = { [request.query.sortBy]: 'desc' };             // client dò được cấu trúc bảng
```

---

## 8. Bảo mật (bắt buộc)

| Quy tắc | Cách làm |
|---|---|
| Hash mật khẩu | `PasswordHasher` (bcrypt, cost factor qua `BCRYPT_SALT_ROUNDS`) |
| Token lưu DB | Lưu **hash SHA-256**, không lưu token thô (`auth.crypto.ts` → `hashToken`) |
| Mã/token ngẫu nhiên | `crypto.randomInt` / `crypto.randomBytes` — **không** `Math.random()` |
| Chống dò tài khoản | Login / forgot-password / resend-verification trả **thông báo chung** (qua `@ResponseMessage`), không tiết lộ email tồn tại |
| Chống brute-force | Khoá tài khoản tạm thời sau `MAX_FAILED_LOGIN_ATTEMPTS` lần sai |
| Refresh token | Rotation + revoke + **reuse-detection** (token đã thu hồi bị dùng lại → thu hồi toàn bộ phiên) |
| Rate limit | `@Throttle()` cho endpoint nhạy cảm (login/register) |

---

## 9. Response phân trang

Decorator `@Pagination()` parse `page/itemsPerPage/search/sort/sortBy` từ query;
repository trả `Paginated<T>` = `{ items, meta }`; `TransformInterceptor` đưa `items` vào `data`
và `meta` ra ngoài:

```jsonc
{
  "statusCode": 200,
  "message": "Success",
  "data": [ /* items */ ],
  "meta": { "total": 42, "page": 1, "pageSize": 10, "totalPages": 5 }
}
```

```ts
@Get()
@CommonPagination(USER_SORT_FIELDS)     // Swagger: page/itemsPerPage/search/sort/sortBy
getAll(@Pagination() params: PaginationParams): Promise<Paginated<SafeUserRow>> {
  return this.userService.getAll(params);
}
```

`itemsPerPage` bị chặn cận trên 100 để client không ép DB trả cả bảng.

---

## 10. Đặt tên

- File: `kebab-case` + hậu tố vai trò: `*.controller.ts`, `*.service.ts`, `*.guard.ts`, `*.dto.ts`.
- Class: `PascalCase`. Biến/hàm: `camelCase`. Hằng số: `UPPER_SNAKE_CASE`.
- Boolean: tiền tố `is/has/should` (`isVerified`).

---

## 11. Định nghĩa "Done"

Một thay đổi chỉ hoàn tất khi:
- [ ] `pnpm typecheck` xanh
- [ ] `pnpm build` xanh
- [ ] `pnpm lint` xanh (không warning mới, **không vi phạm ranh giới tầng**)
- [ ] `pnpm test` xanh (kèm test cho logic mới)
- [ ] Có DTO + Swagger cho endpoint mới
- [ ] Endpoint trả entity → đi qua mapper, không lộ field nhạy cảm
- [ ] Không có `process.env` ngoài vùng cho phép, không lộ field nhạy cảm
- [ ] Migration được tạo nếu schema đổi
