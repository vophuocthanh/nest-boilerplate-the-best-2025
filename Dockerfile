FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies (openssl giúp Prisma generate đúng engine cho alpine)
RUN apk add --no-cache python3 make g++ openssl

# Enable pnpm via corepack (cập nhật corepack để tương thích pnpm 11)
RUN npm install -g corepack@latest && corepack enable

# Copy manifest and lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies (build scripts approved via pnpm-workspace.yaml)
RUN pnpm install --frozen-lockfile

# Copy Prisma schema trước để cache layer `prisma generate`
# (chỉ chạy lại khi schema đổi, không phải mỗi lần sửa src)
COPY prisma ./prisma/
RUN pnpm exec prisma generate

# Copy source code và build
COPY . .
RUN pnpm run build

# Loại devDependencies NGAY trong builder để layer node_modules copy sang runtime đã gọn.
# (prune ở runtime sẽ vô ích vì layer COPY phía dưới vẫn giữ file dev -> phình image)
RUN pnpm prune --prod --ignore-scripts

################################################################################
# PRODUCTION IMAGE

FROM node:22-alpine

# Báo cho Nest/Express và các lib khác chạy ở chế độ production
ENV NODE_ENV=production

# Set working directory
WORKDIR /app

# openssl: cần cho Prisma runtime; tini: làm PID 1 để forward signal (SIGTERM) -> graceful shutdown.
# KHÔNG cần build tools (python3/make/g++) vì native module (bcrypt) đã biên dịch ở stage builder.
# KHÔNG cần pnpm/corepack ở runtime vì node_modules đã được prune sẵn ở builder.
RUN apk add --no-cache openssl tini

# Copy node_modules đã prune sẵn (gồm bcrypt biên dịch + Prisma client) từ builder
COPY --from=builder /app/node_modules ./node_modules

# Copy Prisma schema, package.json và ứng dụng đã build
COPY package.json ./
COPY prisma ./prisma/
COPY --from=builder /app/dist ./dist

# Chạy bằng user không phải root (user `node` uid 1000 có sẵn trong image)
USER node

# Expose port
EXPOSE 3001

# Healthcheck dùng endpoint /api/health đã có sẵn
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1

# tini làm init process -> xử lý signal & reap zombie đúng cách
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/main"]
