# 📐 Tiêu chuẩn Code (BẮT BUỘC)

> Đây là quy ước **bắt buộc** cho mọi thay đổi trong repo này — con người và AI đều phải theo.
> Mỗi quy tắc kèm ví dụ ✅ Nên / ❌ Tránh. Khi nghi ngờ, theo pattern đã có trong codebase.

---

## 1. Cấu trúc & tổ chức

### 1.1 Cấu trúc một module tính năng
Mọi tính năng nằm trong `src/modules/<feature>/`:

```
src/modules/<feature>/
├── <feature>.module.ts        # khai báo module
├── <feature>.controller.ts    # routing + Swagger, KHÔNG chứa business logic
├── <feature>.service.ts       # business logic
├── <feature>.service.spec.ts  # unit test
├── dto/                       # DTO request/response (class-validator)
└── types/                     # interface/type riêng của feature
```

Code hạ tầng dùng chung đặt trong `src/common/`:
```
src/common/
├── decorators/   # @Public(), ...
├── filters/      # AllExceptionsFilter
├── guards/       # JwtAuthGuard
├── interceptors/ # TransformInterceptor
└── pipes/        # validationExceptionFactory
```

### 1.2 Quy ước import path
- Dùng alias **`@app/src/...`** (tuyệt đối từ root) hoặc **`src/...`** — đã cấu hình trong `tsconfig.json` và `jest`.
- Thứ tự import tự động sắp bằng `@trivago/prettier-plugin-sort-imports`. **Không sắp tay**, chạy `pnpm run format`.

✅ Nên
```ts
import { PrismaService } from '@app/src/helpers/prisma.service';
```
❌ Tránh
```ts
import { PrismaService } from '../../../helpers/prisma.service';
```

---

## 2. Controller

- Controller chỉ: nhận request → gọi service → trả kết quả. **Không** chứa business logic, **không** try/catch để format lỗi.
- Mỗi endpoint có `@ApiCommonResponses('mô tả')` (Swagger) và DTO cho `@Body()`/`@Query()`.
- **Không tự bọc** `{ statusCode, ... }` — `TransformInterceptor` lo. Chỉ cần trả:
  - dữ liệu thô, hoặc
  - `{ data, message }` nếu muốn message tuỳ biến, hoặc
  - kết quả `ResponseUtil.paginate(...)` cho danh sách phân trang.

✅ Nên
```ts
@Public()
@Post('login')
@ApiCommonResponses('Login')
async login(@Body() body: LoginDto) {
  const result = await this.authService.login(body);
  return { data: result, message: 'AUTH.LOGIN_SUCCESS' };
}
```
❌ Tránh
```ts
async login(@Body() body: LoginDto, @Res() res) {
  try {
    const result = await this.authService.login(body);
    return res.status(200).json({ statusCode: 200, data: result }); // tự bọc + tự format
  } catch (e) {
    return res.status(400).json({ error: e.message });               // tự bắt lỗi
  }
}
```

---

## 3. Xác thực & phân quyền (Auth)

- **Global `JwtAuthGuard`** đã bảo vệ MỌI route theo mặc định (đăng ký ở `app.module.ts`).
- Route công khai → gắn **`@Public()`** ([src/common/decorators/public.decorator.ts](../src/common/decorators/public.decorator.ts)).
- Giới hạn theo vai trò → gắn **`@Roles('ADMIN')`** (global `RolesGuard` xử lý).
- Lấy thông tin user đã xác thực:
  - `@CurrentUserId() userId: string`
  - `@CurrentUser() user` (payload JWT)
- **WebSocket** dùng `WsJwtAuthGuard` riêng (token qua `handshake.auth.token`).

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
- Thêm biến mới: khai báo schema ở [src/configs/env.validation.ts](../src/configs/env.validation.ts) (Joi, fail-fast) **và** map vào namespace ở [src/configs/configuration.ts](../src/configs/configuration.ts).
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

> Ngoại lệ duy nhất: `main.ts` (bootstrap, trước khi có DI) và 2 file config ở trên.

---

## 5. Xử lý lỗi

- Ném exception chuẩn của NestJS — **không** trả lỗi thủ công.
- Lỗi field-level dùng dạng `{ message: { field: 'thông báo' } }`.
- `AllExceptionsFilter` ([src/common/filters](../src/common/filters/all-exceptions.filter.ts)) chuẩn hoá toàn bộ → `{ statusCode, message, error, timestamp, path }`.

✅ Nên
```ts
throw new HttpException({ message: { email: 'Email đã tồn tại' } }, HttpStatus.BAD_REQUEST);
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

- Truy cập DB qua `PrismaService` (đã inject).
- **Không bao giờ** trả thẳng entity có trường nhạy cảm. Dùng `select` để chỉ lấy field cần, hoặc `ResponseUtil.formatUserResponse`.
- Query đếm tổng + lấy danh sách nên chạy song song.
- Thay đổi schema → tạo migration (`prisma migrate dev`), không sửa DB tay (tránh drift). Xem [BUILD.md](./BUILD.md).

✅ Nên
```ts
const [items, total] = await Promise.all([
  this.prisma.user.findMany({ where, skip, take, select: USER_SELECT }),
  this.prisma.user.count({ where }),
]);
return ResponseUtil.paginate(items, total, page, itemsPerPage);
```
❌ Tránh
```ts
return this.prisma.user.findMany(); // lộ password/token, không phân trang
```

---

## 8. Bảo mật (bắt buộc)

| Quy tắc | Cách làm |
|---|---|
| Hash mật khẩu | `bcrypt` (salt rounds qua hằng số trong service) |
| Token lưu DB | Lưu **hash SHA-256**, không lưu token thô (xem `AuthService.hashToken`) |
| Mã/token ngẫu nhiên | `crypto.randomInt` / `crypto.randomBytes` — **không** `Math.random()` |
| Chống dò tài khoản | Login & forgot-password trả **thông báo chung**, không tiết lộ email tồn tại |
| Refresh token | Rotation + revoke (cấp mới thì thu hồi token cũ) |
| Rate limit | `@Throttle()` cho endpoint nhạy cảm (login/register) |

---

## 9. Response phân trang

Dùng `ResponseUtil.paginate(data, total, page, itemsPerPage)`. Decorator `@Pagination()` parse `page/itemsPerPage/search/sort` từ query.
`TransformInterceptor` tự tách các trường phân trang vào `meta`:

```jsonc
{
  "statusCode": 200,
  "message": "Success",
  "data": [ /* ... */ ],
  "meta": { "total": 42, "page": 1, "pageSize": 10, "totalPages": 5 }
}
```

---

## 10. Đặt tên

- File: `kebab-case` + hậu tố vai trò: `*.controller.ts`, `*.service.ts`, `*.guard.ts`, `*.dto.ts`.
- Class: `PascalCase`. Biến/hàm: `camelCase`. Hằng số: `UPPER_SNAKE_CASE`.
- Boolean: tiền tố `is/has/should` (`isVerified`).

---

## 11. Định nghĩa "Done"

Một thay đổi chỉ hoàn tất khi:
- [ ] `pnpm run build` xanh
- [ ] `pnpm run lint` xanh (không warning mới)
- [ ] `pnpm test` xanh (kèm test cho logic mới)
- [ ] Có DTO + Swagger cho endpoint mới
- [ ] Không có `process.env` ngoài vùng cho phép, không lộ field nhạy cảm
- [ ] Migration được tạo nếu schema đổi
