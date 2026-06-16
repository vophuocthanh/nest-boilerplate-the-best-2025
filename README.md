<div align="center">
  <h1>NestJS Boilerplate</h1>
  <p>A robust and scalable NestJS boilerplate with modern best practices, ready for production use.</p>
</div>

<div align="center">
  <img src="https://img.shields.io/badge/nestjs-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="nestjs" />
  <img src="https://img.shields.io/badge/typescript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="typescript" />
  <img src="https://img.shields.io/badge/postgresql-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="postgresql" />
  <img src="https://img.shields.io/badge/prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="prisma" />
  <img src="https://img.shields.io/badge/socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="socket.io" />

  <img src="https://img.shields.io/badge/docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="docker" />
  <img src="https://img.shields.io/badge/aws-232F3E?style=for-the-badge&logo=amazonaws&logoColor=white" alt="aws" />
</div>

## 📝 Overview

A production-oriented NestJS boilerplate: REST API + real-time chat (Socket.IO), JWT authentication (access + refresh token rotation), role-based access control, Prisma + PostgreSQL, AWS S3 file uploads, transactional email, and ready-to-use Swagger docs.

## 🚀 Key Features

- 🔐 **Auth** — registration with email verification, JWT login, **refresh token rotation** (stored hashed, revocable), forgot/reset/change password, and **Google OAuth**.
- 👥 **RBAC** — role-based access control via `RolesGuard` + the `@Roles('ADMIN')` decorator.
- 💬 **Real-time chat** — send messages, delivery confirmation, and read receipts over a JWT-guarded WebSocket gateway.
- 🗄️ **File uploads** — AWS S3 (single/multiple), avatar upload, and static file serving.
- 🛡️ **Security** — Helmet, environment-aware CORS whitelist, rate limiting (Throttler), and a strict global `ValidationPipe`.
- 🩺 **Health check** — `/api/health` (Terminus + Prisma/DB connectivity check).
- 📚 **Swagger** at `/api` with persisted authorization.
- 🧩 **CRUD generator** — `pnpm gen <name>` scaffolds a full module following the project conventions.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | NestJS 10 |
| Language | TypeScript 5 |
| Database | PostgreSQL 16 |
| ORM | Prisma 5 |
| Real-time | Socket.IO (`@nestjs/platform-socket.io`) |
| Auth | JWT + Passport (`passport-jwt`, `passport-google-oauth20`) |
| Validation | class-validator (DTOs) + Joi (env) |
| Security | Helmet, `@nestjs/throttler` |
| API Docs | Swagger / OpenAPI |
| Mail | `@nestjs-modules/mailer` + Handlebars |
| Storage | AWS S3 (`@aws-sdk/client-s3`) |
| Package manager | pnpm 11 |
| Testing | Jest |

---

## ✅ Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | `>= 18` (recommended `22`) | The Docker image uses `node:22-alpine` |
| pnpm | `11.x` | `npm install -g corepack@latest && corepack enable` |
| PostgreSQL | `16` | Or use the container in `docker-compose.yml` |
| Docker + Compose | optional | Only required for the Docker workflow |

> This project uses **pnpm** (it ships a `pnpm-lock.yaml`). Avoid `npm install` / `yarn` to prevent lockfile drift.

Enable pnpm via corepack (bundled with Node 16.13+):

```bash
npm install -g corepack@latest
corepack enable
pnpm -v   # expect 11.x
```

---

## 🚀 Getting Started

### Option 1 — Local Development

**1. Clone & install dependencies**

```bash
git clone <repository-url>
cd nest-boilerplate
pnpm install
```

**2. Create the environment file**

```bash
cp .env.example .env
```

Fill in at least the 3 **required** variables (the app fails fast if any is missing — validated by Joi in [`src/configs/env.validation.ts`](src/configs/env.validation.ts)):

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nestjs_boilerplate?schema=public
ACCESS_TOKEN_KEY=<any-secret-string>
REFRESH_TOKEN_KEY=<another-secret-string>
```

**3. Initialize the database**

```bash
# First time after cloning: apply existing migrations (also runs prisma generate)
pnpm exec prisma migrate dev

# After editing schema.prisma: create a NEW named migration.
# `dev` is the subcommand; the migration name is passed via --name.
pnpm exec prisma migrate dev --name <migration_name>   # e.g. --name add_product

# Regenerate the Prisma Client (TypeScript types) when needed
pnpm exec prisma generate
```

> `dev` is the Prisma subcommand (not the migration name). The name you choose with `--name` becomes the folder under `prisma/migrations/` (e.g. `20260616_xxxxxx_add_product`). If you omit `--name`, Prisma prompts you for one interactively.

**4. Run the app (watch mode)**

```bash
pnpm run start:dev
```

The app runs at `http://localhost:3001` (default `PORT=3001`):

- API base (global prefix): `http://localhost:3001/api`
- Swagger UI: `http://localhost:3001/api`
- Health check: `http://localhost:3001/api/health`

---

### Option 2 — Docker (app + PostgreSQL)

`docker-compose.yml` spins up two services: `postgres` (database) and `nestjs-app` (the API, built from `Dockerfile`).

**1. Create `.env`**

```bash
cp .env.example .env
```

> In Compose, the container's `DATABASE_URL` is **overridden** to point at the `postgres` service (`postgres:5432`).
> You only need to make sure `.env` defines `ACCESS_TOKEN_KEY` and `REFRESH_TOKEN_KEY`.
> You may change `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` in `.env`.

**2. Build & start**

```bash
docker compose up -d --build
```

**3. Run migrations**

> ⚠️ The runtime image is optimized (devDependencies, pnpm, and the Prisma CLI are stripped), so you **cannot** run `prisma migrate` *inside* the app container. Run migrations **from the host**, targeting the Postgres instance exposed on `localhost:5432`:

```bash
# Your host .env should contain:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nestjs_boilerplate?schema=public
pnpm exec prisma migrate deploy
```

> The host and the container share the same database — only the hostname differs (host = `localhost`, container = `postgres`).

**4. Verify**

```bash
docker compose logs -f nestjs-app
curl http://localhost:3001/api/health
```

#### Docker cheat-sheet

```bash
docker compose up -d                 # Start all services (detached)
docker compose up -d --build         # Rebuild the image, then start
docker compose down                  # Stop & remove containers (keeps the DB volume)
docker compose down -v               # Stop & remove containers AND the DB volume (data loss)
docker compose ps                    # Service status
docker compose logs -f nestjs-app    # Tail app logs
docker compose restart nestjs-app    # Restart only the app service

docker compose exec postgres psql -U postgres -d nestjs_boilerplate   # Open psql
docker compose exec nestjs-app sh                                     # Shell into the app container
```

#### Build & run the image manually (without compose)

```bash
docker build -t nest-boilerplate .
docker run --rm -p 3001:3001 --env-file .env nest-boilerplate
```

---

## 🧩 Generate a CRUD module

Instead of `nest g resource`, use the project generator ([`scripts/generate-module.js`](scripts/generate-module.js)) to scaffold a complete CRUD module under `src/modules/<name>` following the project conventions (Swagger, guards, pagination, `ResponseUtil`, Prisma):

```bash
pnpm gen product
pnpm gen product-category
```

Each run creates:

- `src/modules/<name>/<name>.controller.ts` – CRUD: create / getAll (pagination) / getDetail / update / remove
- `src/modules/<name>/<name>.service.ts` – uses `PrismaService` + `ResponseUtil`
- `src/modules/<name>/<name>.module.ts`
- `src/modules/<name>/dto/` – `create`, `update` (PartialType), and `filter` DTOs with `name`, `description`, `status` fields

It also **registers the module** in `app.module.ts` and **adds a sample Prisma model** to `schema.prisma`.

Optional flags: `--no-model` (skip adding the Prisma model), `--no-register` (skip registering in `app.module.ts`).

After scaffolding (if a new model was added), run a migration:

```bash
pnpm exec prisma migrate dev --name add_product
pnpm exec prisma generate
```

---

## 🗄️ Database & Prisma

### Models ([`prisma/schema.prisma`](prisma/schema.prisma))

| Model | Table | Description |
|-------|-------|-------------|
| `User` | `users` | Users (email, password hash, role, email verification, password reset, points, ...) |
| `RefreshToken` | `refresh_tokens` | Refresh-token sessions (stored **hashed**, with `expiresAt` + `revoked` for rotation/revocation) |
| `Role` | `roles` | Roles (unique `name`, e.g. `ADMIN`) |
| `Message` | `messages` | Chat messages (sender/receiver, `isRead`, `readAt`) |

### Migration cheat-sheet

| Scenario | Command |
|----------|---------|
| After cloning (apply existing migrations) | `pnpm exec prisma migrate dev` |
| After editing `schema.prisma` (dev) | `pnpm exec prisma migrate dev --name <description>` |
| Apply migrations in production/CI | `pnpm exec prisma migrate deploy` |
| Regenerate the Prisma Client | `pnpm exec prisma generate` |
| Open the data GUI | `pnpm exec prisma studio` |
| Reset the DB (wipe + replay migrations) | `pnpm exec prisma migrate reset` |

> Always run `prisma generate` after changing `schema.prisma`.
> `binaryTargets` is configured for both the dev machine (`native`) and Alpine musl (arm64 + x64) for Docker.

---

## 📡 API & Real-time

- All HTTP routes are served under the global prefix **`/api`**. Browse and try them interactively in the **Swagger UI at `http://localhost:3001/api`** (click *Authorize* to attach a Bearer token).
- Responses are normalized through `ResponseUtil`:

  ```jsonc
  // Success
  { "data": <T>, "message": "Success", "status": 200 }

  // Paginated
  { "data": [...], "total": 42, "currentPage": 1, "itemsPerPage": 10, "totalPages": 5, "message": "Success", "status": 200 }
  ```

- Global rate limit: **100 requests / 60s** per IP (some auth endpoints are stricter at 5/60s).

### WebSocket (Socket.IO)

The chat gateway requires a JWT — pass the access token via the handshake auth payload or the `Authorization` header:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: '<accessToken>' }, // or extraHeaders: { Authorization: `Bearer ${token}` }
});

// Client -> Server
socket.emit('sendMessage', { content: 'hello', receiverId: '<userId>' });
socket.emit('markAsRead', '<messageId>');

// Server -> Client
socket.on('newMessage', (message) => {});               // recipient receives a new message
socket.on('messageSent', (message) => {});              // sender gets a delivery confirmation
socket.on('messageRead', ({ messageId, readBy }) => {}); // sender is notified the message was read
socket.on('error', ({ message }) => {});                // processing error
```

See [`src/modules/messages/messages.gateway.ts`](src/modules/messages/messages.gateway.ts).

---

## 📜 NPM Scripts

```bash
pnpm run start:dev      # Dev mode (watch + hot reload)
pnpm run start          # Run (no watch)
pnpm run start:debug    # Debug mode (watch + inspector)
pnpm run build          # Production build -> dist/
pnpm run start:prod     # Run the build: node dist/main

pnpm run lint           # ESLint --fix
pnpm run format         # Prettier --write

pnpm run test           # Unit tests (Jest)
pnpm run test:watch     # Unit tests (watch)
pnpm run test:cov       # Tests + coverage
pnpm run test:e2e       # End-to-end tests

pnpm gen <name>         # Generate a CRUD module
```

---

## 🔧 Environment Variables

Copy from [`.env.example`](.env.example). **Required** (the app stops immediately at startup if missing):

| Variable | Required | Description |
|----------|:---:|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `ACCESS_TOKEN_KEY` | ✅ | Secret for signing/verifying access tokens |
| `REFRESH_TOKEN_KEY` | ✅ | Secret for signing/verifying refresh tokens |
| `NODE_ENV` | ⬜ | `development` \| `production` \| `test` (default `development`) |
| `PORT` | ⬜ | App port (default `3001`) |
| `CORS_ORIGIN` | ⬜ | Allowed origins in `production`, comma-separated |
| `AWS_REGION` · `AWS_ACCESS_KEY_ID` · `AWS_SECRET_ACCESS_KEY` · `AWS_S3_BUCKET_NAME` | ⬜ | Only needed for S3 uploads |
| `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` · `GOOGLE_CALLBACK_URL` | ⬜ | Only needed for Google OAuth |
| `MAIL_HOST` · `MAIL_PORT` · `MAIL_SECURE` · `MAIL_USER` · `MAIL_PASSWORD` · `MAIL_FROM` · `MAIL_TRANSPORT` | ⬜ | Only needed for sending email |
| `URL_RESET_PASSWORD` | ⬜ | Frontend URL that receives the password-reset link |

> In `NODE_ENV=production`, CORS only allows origins listed in `CORS_ORIGIN`; leaving it empty blocks all origins. In dev, all origins are allowed.

---

## 📦 Project Structure

```
src/
├── main.ts                 # Bootstrap: /api prefix, Helmet, CORS, Swagger, ValidationPipe, shutdown hooks
├── app.module.ts           # Root module (registers modules + the global ThrottlerGuard)
├── app.controller.ts       # GET / (hello)
├── modules/                # Feature modules
│   ├── auth/               # Registration/login, JWT, refresh tokens, Google OAuth
│   ├── user/               # User management, avatar, role
│   ├── role/               # Role CRUD
│   ├── messages/           # Real-time chat (gateway + service)
│   ├── mail/               # Email (Handlebars templates)
│   ├── upload/             # File uploads (S3)
│   └── health/             # Health check (Terminus + Prisma)
├── auth/                   # WebSocket guard (ws-jwt-auth.guard.ts)
├── configs/                # env.validation, swagger.config, constants
├── core/                   # Shared models (pagination params/response)
├── decorator/              # AuthenticatedController, pagination, current-user-id, roles, ...
├── guard/                  # RolesGuard, ...
├── helpers/                # PrismaService + PrismaModule
├── lib/                    # file-upload.service, ...
├── middlewares/            # logger, global error handler
├── enums/ · constants/ · types/ · utils/   # ResponseUtil & utilities
prisma/
├── schema.prisma           # Database schema
└── migrations/             # Migration history
scripts/
└── generate-module.js      # Generator for `pnpm gen`
```

---

## 🐳 Docker Image Notes

The `Dockerfile` uses an optimized **multi-stage build**:

- **Builder stage** — installs all deps, compiles native modules (`bcrypt`), runs `prisma generate`, builds TS → `dist/`, then runs `pnpm prune --prod` to drop devDependencies **inside the builder**.
- **Runtime stage** (`node:22-alpine`) — only copies the pruned `node_modules` + `dist` + `prisma`, yielding a final image of **~386MB**.
- Sets `ENV NODE_ENV=production`, runs as the non-root **`node`** user, uses `tini` as PID 1 (graceful shutdown on SIGTERM), and ships a `HEALTHCHECK` hitting `/api/health`.
- pnpm / the Prisma CLI are **not** present in the runtime image → run migrations from the host or CI (see the Docker section above).

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit using Conventional Commits (`git commit -m 'feat: add amazing feature'`) — the repo enforces Husky + commitlint + lint-staged
4. Push (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- NestJS team for the amazing framework
- Socket.IO for real-time capabilities
- All contributors who have helped shape this project
