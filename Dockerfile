# Base image
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install production dependencies and OpenSSL
RUN apk add --no-cache python3 make g++ openssl

# Copy package files
COPY package*.json ./

# Install production dependencies only and rebuild bcrypt
RUN npm ci --omit=dev --ignore-scripts && \
    npm rebuild bcrypt --build-from-source

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy built application
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/main"]