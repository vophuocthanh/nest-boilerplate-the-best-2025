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

A robust and scalable real-time chat application built with NestJS, featuring modern architecture and best practices. This application provides real-time messaging capabilities with features like message delivery status, read receipts, and user presence.

## 🚀 Key Features

### 1. Real-time Messaging

- 💬 Instant message delivery
- ✅ Message read receipts
- 📱 Online/offline status
- 🔄 Message synchronization
- 📊 Message delivery status

### 2. Authentication & Security

- 🔐 JWT-based authentication
- 🛡️ WebSocket security
- 👥 Role-based access control
- 🔒 End-to-end encryption (optional)

### 3. User Management

- 👤 User profiles
- 🖼️ Avatar support
- 🔍 User search
- 👥 Contact management

### 4. Message Features

- 📝 Text messages
- 📎 File attachments
- 🖼️ Image sharing
- 📊 Message statistics
- 🔍 Message search

### 5. File Handling

- 🗄️ AWS S3 integration
- 📤 File upload support
- 📁 Static file serving

## 🏗️ System Architecture

### 1. Backend Architecture

```
src/
├── messages/              # Message module
│   ├── dto/              # Data transfer objects
│   ├── messages.gateway.ts # WebSocket gateway
│   ├── messages.service.ts # Business logic
│   └── messages.module.ts # Module configuration
├── auth/                 # Authentication module
│   ├── guards/          # Authentication guards
│   ├── strategies/      # Auth strategies
│   └── decorators/      # Custom decorators
└── prisma/              # Database
    └── schema.prisma    # Database schema
```

### 2. Database Schema

```prisma
model Message {
  id        String   @id @default(uuid())
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  senderId   String
  sender     User   @relation("SentMessages", fields: [senderId], references: [id])
  receiverId String
  receiver   User   @relation("ReceivedMessages", fields: [receiverId], references: [id])
  isRead Boolean   @default(false)
  readAt DateTime?
}

model User {
  id                        String    @id @default(uuid())
  email                     String    @unique
  googleId                  String?
  password                  String?
  phone                     String?
  address                   String?
  avatar                    String?
  name                      String
  date_of_birth             String?
  country                   String?
  createAt                  DateTime  @default(now())
  updateAt                  DateTime? @updatedAt
  confirmPassword           String?
  roleId                    String?
  verificationCode          String?
  verificationCodeExpiresAt DateTime?
  isVerified                Boolean   @default(false)
  role                      Role?     @relation(fields: [roleId], references: [id])
  points                    Int?      @default(0)
  sentMessages     Message[] @relation("SentMessages")
  receivedMessages Message[] @relation("ReceivedMessages")
}
```

### 3. WebSocket Events

```typescript
// Client Events
socket.emit('sendMessage', { content, receiverId });
socket.emit('markAsRead', messageId);

// Server Events
socket.on('newMessage', (message) => {});
socket.on('messageRead', ({ messageId, readBy }) => {});
socket.on('messageSent', (message) => {});
```

## 🛠️ Tech Stack

### Backend

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Real-time**: Socket.IO
- **Authentication**: JWT

### Development Tools

- **Testing**: Jest
- **Linting**: ESLint
- **Formatting**: Prettier
- **Version Control**: Git

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- PostgreSQL
- Docker & Docker Compose (optional)
- npm or yarn

### Installation

#### Option 1: Local Development

1. Clone the repository:

```bash
git clone <repository-url>
cd nest-boilerplate
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Configure your database:

##### Initial setup after cloning

```bash
npx prisma migrate dev
```

##### When making changes to schema.prisma

```bash
npx prisma migrate dev --name descriptive_name
```

##### Generate Prisma Client

```bash
npx prisma generate
```

Note: Run `npx prisma generate` after any changes to schema.prisma to update TypeScript types.

5. Start the application:

```bash
npm run start:dev
```

#### Option 2: Docker Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd nest-boilerplate
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Build and start containers:

```bash
docker-compose up -d
```

4. Run database migrations:

```bash
docker-compose exec api npx prisma migrate deploy
```

5. View logs:

```bash
docker-compose logs -f
```

### Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Rebuild containers
docker-compose up -d --build

# View logs
docker-compose logs -f

# Access PostgreSQL
docker-compose exec postgres psql -U postgres

# Access API container
docker-compose exec api sh
```

## 📚 API Documentation

### WebSocket Events

#### Client to Server

- `sendMessage`: Send a new message

  ```typescript
  socket.emit('sendMessage', {
    content: string,
    receiverId: string,
  });
  ```

- `markAsRead`: Mark message as read
  ```typescript
  socket.emit('markAsRead', messageId: string);
  ```

#### Server to Client

- `newMessage`: Receive new message
- `messageSent`: Message sent confirmation
- `messageRead`: Message read notification

## 🔧 Environment Variables

```env
PORT=port
DATABASE_URL=url-to-your-database
ACCESS_TOKEN_KEY=access-token-key
REFRESH_TOKEN_KEY=refresh-token-key
JWT_SECRET=jwt-secret-key
AWS_REGION=aws-region
AWS_ACCESS_KEY_ID=aws-access-key-id
AWS_SECRET_ACCESS_KEY=aws-secret-access-key
AWS_S3_BUCKET_NAME=aws-s3-bucket-name
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=url-to-your-google-callback

MAIL_HOST=example@gmail.com
MAIL_PORT=port-number
MAIL_SECURE=false
MAIL_USER=example@gmail.com
MAIL_PASSWORD=mail-password
MAIL_FROM=example@gmail.com
```

## 📦 Project Structure

```
src/
├── messages/           # Message module
│   ├── dto/           # Data transfer objects
│   ├── messages.gateway.ts
│   ├── messages.service.ts
│   └── messages.module.ts
├── auth/              # Authentication
│   ├── guards/
│   ├── strategies/
│   └── decorators/
├── common/            # Shared resources
├── config/            # Configuration
└── prisma/            # Database
    └── schema.prisma
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- NestJS team for the amazing framework
- Socket.IO for real-time capabilities
- All contributors who have helped shape this project
