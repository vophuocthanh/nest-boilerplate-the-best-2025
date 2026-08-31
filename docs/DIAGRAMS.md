# 🗺️ Sơ đồ kiến trúc & Luồng request

> Mọi sơ đồ dưới đây vẽ theo **code thật** trong repo (không phải mô hình lý thuyết).
> Mỗi hộp đều kèm file tương ứng để bấm thẳng vào.
>
> Liên quan: [ARCHITECTURE.md](./ARCHITECTURE.md) · [CODING_STANDARDS.md](./CODING_STANDARDS.md)

---

## 1. Bản đồ tổng thể — 4 tầng

```mermaid
graph TB
    CLIENT(["🌐 Client<br/>web · mobile · Postman"])

    subgraph BOOT["🚀 bootstrap"]
        MAIN["main.ts<br/><i>prefix /api · versioning · helmet<br/>CORS · body parser · Swagger</i>"]
        APPMOD["app.module.ts<br/><i>nạp config + liệt kê feature</i>"]
    end

    subgraph MODULES["🧩 modules/ — NGHIỆP VỤ"]
        AUTH["auth<br/><i>login · register · token</i>"]
        USER["user<br/><i>hồ sơ · avatar · role</i>"]
        ROLE["role<br/><i>CRUD vai trò</i>"]
        MSG["messages<br/><i>chat realtime</i>"]
        UPLOAD["upload<br/><i>upload ảnh</i>"]
        HEALTH["health<br/><i>health check</i>"]
    end

    subgraph INTEG["🔌 integrations/ — RA NGOÀI PROCESS"]
        STORAGE["storage<br/><b>StorageService</b> (port)<br/>↳ S3StorageService"]
        MAILI["mail<br/><b>MailService</b><br/>SMTP + Handlebars"]
    end

    subgraph CORE["⚙️ core/ — CHẠY CHO MỌI REQUEST"]
        MW["middlewares<br/><i>requestId → logger</i>"]
        GUARDS["guards<br/><i>JwtAuth · Roles</i>"]
        INTER["interceptors<br/><i>Transform</i>"]
        FILTER["filters<br/><i>AllExceptions</i>"]
        PIPES["pipes<br/><i>validationExceptionFactory</i>"]
        JWTC["jwt<br/><i>JwtCoreModule</i>"]
        DB[("database<br/>PrismaService @Global")]
    end

    subgraph SHARED["📦 shared/ — TÁI DÙNG, KHÔNG ĐĂNG KÝ GÌ"]
        DEC["decorators<br/><i>@Public @Roles @CurrentUser<br/>@Pagination @ResponseMessage</i>"]
        PAG["pagination<br/><i>paginate() · Paginated&lt;T&gt;</i>"]
        TYP["types · constants"]
    end

    subgraph CONFIG["🔧 config/ — ĐẾN TỪ ENV"]
        CFG["configuration · env.validation<br/>cors · multer · swagger"]
    end

    PG[("🐘 PostgreSQL")]
    S3EXT(["☁️ AWS S3"])
    SMTP(["📧 SMTP"])

    CLIENT --> MAIN --> APPMOD
    APPMOD --> MODULES
    APPMOD --> CORE

    MODULES --> INTEG
    MODULES --> CORE
    MODULES --> SHARED
    CORE --> SHARED
    CORE --> CONFIG
    INTEG --> CONFIG

    DB --> PG
    STORAGE --> S3EXT
    MAILI --> SMTP
```

### Quy tắc phụ thuộc — mũi tên CHỈ đi một chiều

```
modules/  ──▶  integrations/  ──▶  config/
   │                                  ▲
   ├──────▶  core/  ──────────────────┤
   │           │                      │
   └──────▶  shared/  ────────────────┘
```

| ❌ Cấm | Vì sao |
|---|---|
| `core/` · `shared/` · `integrations/` import `modules/` | Xoá một feature không được làm vỡ hạ tầng |
| `shared/` import `core/` hoặc `integrations/` | `shared/` là tầng đáy, phải dùng lại được ở mọi nơi |
| Trong `modules/`: import bằng `../../…` | Ẩn mất phụ thuộc; bắt buộc dùng alias `@/…` |

Cả 4 quy tắc được **ESLint chặn** ([.eslintrc.js](../.eslintrc.js)) → vi phạm là fail CI, không phụ thuộc trí nhớ reviewer.

---

## 2. Đặt file mới ở đâu? — cây quyết định

```mermaid
flowchart TD
    START{{"Tôi vừa viết một file mới.<br/>Đặt nó ở đâu?"}}
    Q1{"Giá trị của nó<br/>đến từ biến môi trường?"}
    Q2{"Nó chạy cho<br/>MỌI request?"}
    Q3{"Nó gọi ra ngoài process?<br/>(HTTP · SMTP · S3 · queue)"}
    Q4{"Nó chứa quy tắc<br/>nghiệp vụ cụ thể?"}

    C["📁 config/"]
    CO["📁 core/"]
    I["📁 integrations/<br/><i>nhớ tách port + adapter</i>"]
    M["📁 modules/&lt;feature&gt;/<br/><i>pnpm gen &lt;ten&gt;</i>"]
    S["📁 shared/"]

    START --> Q1
    Q1 -- có --> C
    Q1 -- không --> Q2
    Q2 -- có --> CO
    Q2 -- không --> Q3
    Q3 -- có --> I
    Q3 -- không --> Q4
    Q4 -- có --> M
    Q4 -- không --> S
```

---

## 3. Vòng đời một HTTP request

Thứ tự thật của NestJS. Chú ý **interceptor bọc hai đầu** quanh pipe + controller —
đây là chỗ hay bị vẽ sai thành "interceptor chạy sau controller".

```
┌─ REQUEST ────────────────────────────────────────────────────────────────┐
│                                                                          │
│  1  express: json / urlencoded (limit 1mb)          main.ts              │
│  2  helmet  (tắt CSP riêng cho /docs)               main.ts              │
│  3  CORS    (production: whitelist CORS_ORIGIN)     main.ts              │
│                                                                          │
│  4  requestIdMiddleware   → gắn req.id + header X-Request-Id             │
│  5  loggerMiddleware      → log dòng vào            CoreModule.configure │
│                                                                          │
│  6  ThrottlerGuard        → rate limit theo IP                           │
│  7  JwtAuthGuard          → @Public? bỏ qua : verify JWT → req.user      │
│  8  RolesGuard            → @Roles? so với req.user.role                 │
│                                                    ↑ thứ tự = thứ tự     │
│                                                      khai báo APP_GUARD  │
│  ╔══ 9  TransformInterceptor — PHA VÀO ════════════════════════════════╗ │
│  ║       đọc @SkipTransform · @ResponseMessage · res.statusCode        ║ │
│  ║                                                                     ║ │
│  ║   10  FileInterceptor (multer)  ← chỉ route có upload               ║ │
│  ║   11  ValidationPipe            → DTO: whitelist + transform        ║ │
│  ║   12  Param decorator           → @CurrentUserId() @Pagination()    ║ │
│  ║                                                                     ║ │
│  ║   13  Controller  ─▶  Service  ─▶  Repository  ─▶  Prisma  ─▶  DB   ║ │
│  ║                          └────▶  Mapper (entity → DTO, whitelist)   ║ │
│  ║                                                                     ║ │
│  ║   14  TransformInterceptor — PHA RA                                 ║ │
│  ║       { statusCode, message, data, meta? }                          ║ │
│  ╚═════════════════════════════════════════════════════════════════════╝ │
│                                                                          │
│  ✗  Ném exception ở BẤT KỲ bước nào  ─▶  AllExceptionsFilter            │
│                                          (pha RA của interceptor bị bỏ) │
│                                                                          │
│  15 loggerMiddleware: res.on('finish') → log status + thời gian          │
└─ RESPONSE ───────────────────────────────────────────────────────────────┘
```

---

## 4. Trace thật — `POST /api/auth/login` (route công khai)

```mermaid
sequenceDiagram
    autonumber
    actor U as Client
    participant MW as middlewares
    participant G as Guards
    participant TI as TransformInterceptor
    participant VP as ValidationPipe
    participant C as AuthController
    participant S as AuthService
    participant UR as UserRepository
    participant PH as PasswordHasher
    participant TS as TokenService
    participant RT as RefreshTokenRepository
    participant DB as PostgreSQL

    U->>MW: POST /api/auth/login { email, password }
    MW->>MW: gắn req.id · log dòng vào

    MW->>G: ThrottlerGuard — 5 req/60s (@Throttle)
    G->>G: JwtAuthGuard — thấy @Public ⇒ bỏ qua
    G->>G: RolesGuard — không có @Roles ⇒ cho qua

    G->>TI: PHA VÀO
    TI->>TI: đọc @ResponseMessage = "AUTH.LOGIN_SUCCESS"

    TI->>VP: validate LoginDto
    Note over VP: whitelist + forbidNonWhitelisted<br/>field lạ ⇒ 400 ngay tại đây

    VP->>C: login(body)
    C->>S: authService.login(credentials)

    S->>UR: findByEmailWithRole(email)
    UR->>DB: SELECT … FROM users JOIN roles
    DB-->>UR: User + Role
    UR-->>S: UserWithRole

    S->>S: lockedUntil > now? ⇒ 401 (message CHUNG)
    S->>PH: compare(password, user.password)
    PH-->>S: true

    alt sai mật khẩu
        S->>UR: recordFailedLogin / lockAccount
        S-->>C: 401 "Email hoặc mật khẩu không đúng"
    end

    S->>UR: clearLoginFailures(id)
    S->>S: isVerified? role? ⇒ 401 / 403

    S->>TS: generateTokens(user)
    TS->>TS: ký access + refresh (song song)
    TS->>RT: create(userId, hashToken(refresh), expiresAt)
    Note over RT,DB: lưu HASH SHA-256,<br/>KHÔNG lưu token thô
    RT->>DB: INSERT refresh_tokens
    TS-->>S: { accessToken, refreshToken }

    S->>S: toSafeUser(user) — chỉ 4 field
    S-->>C: AuthResult

    C->>TI: PHA RA
    TI-->>U: 200 { statusCode, message:"AUTH.LOGIN_SUCCESS", data:{…} }
    MW->>MW: log status + thời gian
```

**Response cuối cùng:**

```jsonc
{
  "statusCode": 200,
  "message": "AUTH.LOGIN_SUCCESS",
  "data": {
    "accessToken": "eyJ…",
    "refreshToken": "eyJ…",
    "user": { "id": "…", "name": "…", "email": "…", "role": "USER" }
  }
}
```

> 🔐 Ba message lỗi khác nhau (email không tồn tại · sai mật khẩu · tài khoản bị khoá)
> đều trả **cùng một chuỗi** — để kẻ tấn công không dò được email nào đã đăng ký.

---

## 5. Trace thật — `GET /api/user/me` (route được bảo vệ)

Đây là đường đi cho thấy rõ **mapper chặn rò rỉ dữ liệu**.

```mermaid
sequenceDiagram
    autonumber
    actor U as Client
    participant G as JwtAuthGuard
    participant JS as JwtStrategy
    participant RG as RolesGuard
    participant TI as TransformInterceptor
    participant C as UserController
    participant S as UserService
    participant R as UserRepository
    participant M as user.mapper
    participant DB as PostgreSQL

    U->>G: GET /api/user/me<br/>Authorization: Bearer eyJ…
    G->>G: không có @Public ⇒ phải xác thực
    G->>JS: passport-jwt verify chữ ký + hạn
    JS-->>G: req.user = { id, email, name, role }
    G->>RG: RolesGuard — route không có @Roles ⇒ qua
    RG->>TI: PHA VÀO (message mặc định "Success")

    TI->>C: @CurrentUserId() ⇒ req.user.id
    C->>S: getDetail(userId)
    S->>R: findByIdWithRole(id)
    R->>DB: SELECT * FROM users WHERE id = …
    DB-->>R: bản ghi ĐẦY ĐỦ 20 field

    Note over R,M: ⚠️ Bản ghi này CÓ password hash,<br/>resetToken, googleId, lockedUntil…

    R-->>S: UserWithRole
    S->>M: toUserDto(user)
    Note over M: WHITELIST — liệt kê tường minh<br/>12 field được phép lộ ra
    M-->>S: UserDto (sạch)

    S-->>C: UserDto
    C->>TI: PHA RA
    TI-->>U: 200 { statusCode, message:"Success", data: UserDto }
```

### Vì sao whitelist chứ không phải blacklist

```mermaid
graph LR
    subgraph OLD["❌ Cách cũ — blacklist"]
        O1["bản ghi 20 field"] --> O2["delete theo danh sách<br/>4 tên đã biết<br/><i>(1 tên còn không tồn tại)</i>"] --> O3["còn 17 field<br/>lộ resetToken · googleId<br/>lockedUntil · failedLoginAttempts"]
    end
    subgraph NEW["✅ Cách mới — whitelist"]
        N1["bản ghi 20 field"] --> N2["toUserDto()<br/>liệt kê 12 field cho phép"] --> N3["đúng 12 field<br/>thêm field mới vào schema<br/>⇒ mặc định KHÔNG lộ"]
    end
```

> Thêm cột `twoFactorSecret` vào `schema.prisma`: cách cũ **tự động lộ ra**, cách mới **tự động ẩn**.
> Đây là *fail closed* — hướng sai lệch an toàn.

---

## 6. Nhánh lỗi — `AllExceptionsFilter`

Khi có exception, **pha RA của interceptor không chạy** → không có envelope thành công.

```mermaid
flowchart TD
    T{"Exception ném ra từ<br/>guard · pipe · controller · service · Prisma"}

    T --> H["HttpException<br/><i>NotFoundException, BadRequestException…</i>"]
    T --> P["Prisma error"]
    T --> V["ValidationPipe"]
    T --> X["Lỗi không lường trước"]

    P --> P1["P2002 → 409 Conflict"]
    P --> P2["P2025 → 404 Not Found"]
    P --> P3["P2003 / P2014 → 400"]
    P --> P4["ValidationError → 400"]
    P --> P5["InitializationError → 503"]

    V --> V1["validationExceptionFactory<br/>{ message: { field: '…' } }"]

    X --> X1["500 — message che đi,<br/>stack chỉ vào log"]

    H --> F["AllExceptionsFilter"]
    P1 --> F
    P2 --> F
    P3 --> F
    P4 --> F
    P5 --> F
    V1 --> F
    X1 --> F

    F --> LOG{"status ≥ 500?"}
    LOG -- có --> L1["logger.error + stack"]
    LOG -- 4xx --> L2["logger.warn, không stack<br/><i>triage bug client mà không nhiễu log</i>"]

    L1 --> OUT
    L2 --> OUT

    OUT["{ statusCode, message, error,<br/>timestamp, path, requestId }"]
```

**Ví dụ** — `GET /api/user/khong-ton-tai`:

```jsonc
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found",
  "timestamp": "2026-08-28T…",
  "path": "/api/user/khong-ton-tai",
  "requestId": "3f2a…"    // ← nối được với 2 dòng log của chính request này
}
```

---

## 7. Sơ đồ phụ thuộc giữa các module

Mũi tên = `imports` trong `@Module`. Không có vòng lặp (đã kiểm bằng test dựng DI graph).

```mermaid
graph TD
    APP["AppModule"]
    CORE["CoreModule<br/><i>PrismaModule · Throttler · Schedule<br/>+ global filter/guard/interceptor</i>"]

    AUTH["AuthModule"]
    USER["UserModule"]
    ROLE["RoleModule"]
    MSG["MessagesModule"]
    UPL["UploadModule"]
    HLT["HealthModule"]

    JWTC["JwtCoreModule"]
    STG["StorageModule"]
    MAIL["MailModule"]

    APP --> CORE
    APP --> AUTH
    APP --> USER
    APP --> ROLE
    APP --> MSG
    APP --> UPL
    APP --> HLT

    AUTH --> USER
    AUTH --> ROLE
    AUTH --> JWTC
    AUTH --> MAIL

    USER --> ROLE
    USER --> STG

    MSG --> USER
    MSG --> JWTC

    UPL --> STG
```

> Lược bớt cho dễ đọc: `AuthModule` còn import `PassportModule`, và `HealthModule` import
> `TerminusModule` — đều là module hạ tầng của framework, không phải phụ thuộc nghiệp vụ.

### Chủ sở hữu aggregate — mỗi bảng đúng MỘT repository

```mermaid
graph LR
    UR["UserRepository<br/><i>modules/user</i>"] --> T1[("users")]
    RR["RoleRepository<br/><i>modules/role</i>"] --> T2[("roles")]
    TR["RefreshTokenRepository<br/><i>modules/auth</i>"] --> T3[("refresh_tokens")]
    MS["MessageService<br/><i>modules/messages</i>"] --> T4[("messages")]

    A["auth: AuthService<br/>RegistrationService<br/>PasswordService<br/>TokenService"] -.->|UserModule.exports| UR
    A -.->|RoleModule.exports| RR
    M["messages: MessageService"] -.->|UserModule.exports| UR
    U["user: UserService"] -.->|RoleModule.exports| RR
```

> Trước tối ưu, **6 file thuộc 3 module** cùng gọi thẳng `prisma.user.*`.
> Giờ muốn thêm soft-delete hay audit log cho `users` → sửa **một** file.

---

## 8. WebSocket — đường đi KHÁC hoàn toàn HTTP

Gateway **không** đi qua middleware / guard / pipe / interceptor của HTTP.
Đây là lý do gateway phải tự verify token và tự validate payload.

```mermaid
sequenceDiagram
    autonumber
    actor U as Client
    participant GW as MessagesGateway
    participant JWT as JwtService
    participant MS as MessageService
    participant UR as UserRepository
    participant DB as PostgreSQL
    actor R as Người nhận

    U->>GW: connect · auth: { token }
    GW->>JWT: verify(token, jwt.accessSecret)
    alt token sai / thiếu
        GW-->>U: disconnect (log warn)
    end
    JWT-->>GW: payload.id
    GW->>GW: map userId ⇒ tập socket đang mở<br/><i>hỗ trợ nhiều thiết bị cùng lúc</i>

    U->>GW: emit "sendMessage" { content, receiverId }
    GW->>GW: validate tay (không có ValidationPipe)
    GW->>MS: createMessage(senderId, dto)
    Note over GW,MS: senderId lấy từ TOKEN,<br/>không nhận từ client (chống spoofing)
    MS->>UR: exists(receiverId)
    UR->>DB: SELECT id FROM users
    MS->>DB: INSERT messages
    MS-->>GW: message

    GW-->>R: emit "newMessage" (mọi thiết bị đang online)
    GW-->>U: emit "messageSent"
```

---

## 9. Hợp đồng response — chỉ hai hình dạng

```mermaid
graph TD
    P{"Controller trả về gì?"}
    P -->|"Paginated&lt;T&gt; = { items, meta }"| A["data = items<br/>meta = meta"]
    P -->|"Còn lại (DTO · mảng · void)"| B["data = giá trị đó<br/>(void ⇒ null)"]
    P -->|"route có @SkipTransform()"| C["trả nguyên payload gốc<br/><i>vd health-check Terminus</i>"]

    A --> OUT["{ statusCode, message, data, meta? }"]
    B --> OUT
```

```jsonc
// thường
{ "statusCode": 200, "message": "Success", "data": { } }

// phân trang
{ "statusCode": 200, "message": "Success", "data": [ ],
  "meta": { "total": 42, "page": 1, "pageSize": 10, "totalPages": 5 } }
```

- `message` khai bằng `@ResponseMessage('…')`, mặc định `"Success"`.
- `statusCode` trong body **luôn khớp** HTTP status thật (đã kiểm chứng với route 201).
- Service **không bao giờ** tự bọc `{ data, message }` — chỉ trả dữ liệu thô.

---

## 10. Muốn thêm thứ này thì sửa ở đâu?

| Tôi muốn… | Sửa ở |
|---|---|
| Thêm một endpoint CRUD mới | `pnpm gen <ten>` → sửa DTO + mapper |
| Thêm biến môi trường | [config/env.validation.ts](../src/config/env.validation.ts) **và** [config/configuration.ts](../src/config/configuration.ts) |
| Đổi format response thành công | [core/interceptors/transform.interceptor.ts](../src/core/interceptors/transform.interceptor.ts) — một file duy nhất |
| Đổi format lỗi / map thêm mã Prisma | [core/filters/all-exceptions.filter.ts](../src/core/filters/all-exceptions.filter.ts) |
| Đổi message của một route | Gắn `@ResponseMessage('…')` trên route đó |
| Mở một route thành công khai | Gắn `@Public()` |
| Giới hạn route theo vai trò | Gắn `@Roles('ADMIN')` |
| Đổi S3 sang local disk / GCS | Viết adapter mới + đổi 1 dòng trong [storage.module.ts](../src/integrations/storage/storage.module.ts) |
| Cho phép sort theo field mới | Thêm vào `<feature>.constants.ts` → `*_SORT_FIELDS` |
| Thêm field vào response user | [user.mapper.ts](../src/modules/user/user.mapper.ts) + [dto/user-response.dto.ts](../src/modules/user/dto/user-response.dto.ts) |
| Thêm truy vấn mới trên bảng `users` | [user.repository.ts](../src/modules/user/user.repository.ts) — **không** gọi Prisma ở nơi khác |
| Đổi thuật toán ký JWT | [core/jwt/jwt-core.module.ts](../src/core/jwt/jwt-core.module.ts) — một bản duy nhất cho cả HTTP lẫn WebSocket |
| Đổi rate limit toàn cục | [core/core.module.ts](../src/core/core.module.ts) |
