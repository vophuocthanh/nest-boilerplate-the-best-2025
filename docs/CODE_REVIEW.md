# ✅ Checklist Review Code

Dùng khi tự kiểm trước khi tạo PR, hoặc khi review PR của người khác / output của AI.
Mỗi mục là một tiêu chí **chấp nhận** — fail bất kỳ mục nào thì chưa merge.

> Phân tích chất lượng codebase ban đầu (one-time) nằm ở [../CODE_REVIEW.md](../CODE_REVIEW.md).
> Việc còn lại theo lộ trình ở [ROADMAP.md](./ROADMAP.md).

---

## 1. Đúng kiến trúc & quy ước
- [ ] Code đặt đúng tầng: `modules/` (nghiệp vụ) · `core/` (chạy mọi request) · `shared/` (tái dùng) · `integrations/` (gọi ra ngoài) · `config/` (đến từ env).
- [ ] Không phá ranh giới tầng — `pnpm lint` phải xanh (`no-restricted-imports` sẽ chặn).
- [ ] Import xuyên tầng/xuyên module dùng alias `@/…`; trong cùng module dùng `./…`.
- [ ] Module mới tạo bằng `pnpm gen`, đủ controller/service/repository/mapper.
- [ ] Controller không chứa business logic; logic nằm ở service.
- [ ] Tuân thủ [CODING_STANDARDS.md](./CODING_STANDARDS.md).

## 2. Xác thực & phân quyền
- [ ] Route công khai có `@Public()`; route hạn chế có `@Roles()`.
- [ ] Không tự verify JWT / đọc header `Authorization` thủ công.
- [ ] Lấy user qua `@CurrentUserId()` / `@CurrentUser()`.

## 3. Cấu hình
- [ ] Không có `process.env` ngoài `main.ts` / `app.controller.ts` / `config/`.
- [ ] Biến mới đã được khai báo ở `env.validation.ts` **và** `configuration.ts`.

## 4. Xử lý lỗi & response
- [ ] Lỗi được `throw` bằng exception NestJS, không trả lỗi thủ công.
- [ ] Không tự bọc `{ statusCode, ... }` / `{ data, message }` trong controller hay service.
- [ ] Message tuỳ biến khai báo bằng `@ResponseMessage()`, không nhét vào payload.
- [ ] Không nuốt lỗi (`catch {}` rỗng) làm mất stack/thông tin.

## 5. Validation & dữ liệu
- [ ] Mọi `@Body()`/`@Query()` có DTO + `class-validator` + `@ApiProperty()`.
- [ ] Trường ngày dùng `@Type(() => Date) @IsDate()` khớp `DateTime`.

## 6. Bảo mật
- [ ] **Không lộ** `password`, `verificationCode`, `resetToken`, `googleId`, `lockedUntil`… trong response.
- [ ] Entity trả ra client đi qua `*.mapper.ts` (whitelist), KHÔNG dùng blacklist `delete obj.x`.
- [ ] Token lưu DB ở dạng **hash**, không lưu thô.
- [ ] Random bảo mật dùng `crypto`, không `Math.random()`.
- [ ] Không tạo account enumeration (login/forgot trả thông báo chung).
- [ ] Endpoint nhạy cảm có `@Throttle()`.

## 7. Prisma / hiệu năng
- [ ] Truy vấn nằm trong repository của module sở hữu bảng, không rải ra service/module khác.
- [ ] Dùng `select` / mapper thay vì trả nguyên entity.
- [ ] Danh sách có phân trang qua `paginate()`, kèm `allowedSortFields`.
- [ ] Schema đổi → có migration; không sửa DB tay.

## 8. Chất lượng & test
- [ ] `pnpm typecheck` và `pnpm build` xanh.
- [ ] `pnpm lint` xanh, không warning mới.
- [ ] `pnpm test` xanh; logic mới có unit test.
- [ ] Không để lại code chết / import thừa / `console.log` debug.

## 9. Tài liệu
- [ ] Cập nhật tài liệu trong `docs/` nếu thay đổi pattern/quy ước.
- [ ] Commit message theo Conventional Commits.

---

## Cách đánh giá output của AI
Khi AI sinh code cho repo này, reviewer kiểm thêm:
- AI có **tái sử dụng** các thành phần ở [IMPLEMENTATION.md](./IMPLEMENTATION.md) thay vì tự viết lại không?
- Có route nào vô tình bị lộ (thiếu guard) hoặc bị khoá nhầm (thừa `@Public`) không?
- Có thêm dependency mới không cần thiết không? (ưu tiên dùng cái đã có)
