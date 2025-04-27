# NestJS Boilerplate

A robust and scalable NestJS boilerplate with modern best practices, ready for production use.

## 🛠️ Tech Stack

<div align="center">
  <img src="https://img.shields.io/badge/nestjs-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="nestjs" />
  <img src="https://img.shields.io/badge/typescript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="typescript" />
  <img src="https://img.shields.io/badge/postgresql-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="postgresql" />
  <img src="https://img.shields.io/badge/prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="prisma" />
  <img src="https://img.shields.io/badge/docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="docker" />
  <img src="https://img.shields.io/badge/aws-232F3E?style=for-the-badge&logo=amazonaws&logoColor=white" alt="aws" />
  <img src="https://img.shields.io/badge/jest-C21325?style=for-the-badge&logo=jest&logoColor=white" alt="jest" />
  <img src="https://img.shields.io/badge/socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="socket.io" />
</div>

## 🚀 Features

- **Authentication & Authorization**

  - JWT-based authentication
  - Google OAuth2.0 integration
  - Role-based access control

- **Database**

  - Prisma ORM integration
  - PostgreSQL database support
  - Database migrations and seeding

- **API Documentation**

  - Swagger/OpenAPI integration
  - API versioning
  - Request/Response validation

- **File Handling**

  - AWS S3 integration
  - File upload support
  - Static file serving

- **Email Service**

  - Nodemailer integration
  - HTML email templates
  - Email queue system

- **Real-time Features**

  - WebSocket support
  - Socket.IO integration
  - Real-time notifications

- **Development Tools**
  - TypeScript support
  - ESLint & Prettier configuration
  - Husky pre-commit hooks
  - Conventional commit messages
  - Jest testing framework

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL
- Docker and Docker Compose (optional)
- AWS S3 account (for file storage)
- Google OAuth credentials (for Google login)

## 🛠️ Installation

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

Edit the `.env` file with your configuration.

4. Set up the database:

```bash
npx prisma generate
```

## 🚀 Running the Application

### Development

```bash
npm run start:dev
```

### Production

```bash
npm run build
npm run start:prod
```

### Docker

```bash
docker-compose build
```

#### Run start

```bash
docker-compose up -d
```

## 📚 API Documentation

Once the application is running, you can access the Swagger documentation at:

```
http://localhost:3001/api
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📦 Project Structure

```
src/
├── config/         # Configuration files
├── modules/        # Feature modules
├── common/         # Shared resources
├── decorators/     # Custom decorators
├── filters/        # Exception filters
├── guards/         # Authentication guards
├── interceptors/   # Request/Response interceptors
├── interfaces/     # TypeScript interfaces
├── middleware/     # Custom middleware
├── pipes/          # Validation pipes
└── utils/          # Utility functions
```

## 🔧 Available Scripts

- `npm run start` - Start the application
- `npm run start:dev` - Start the application in development mode
- `npm run start:debug` - Start the application in debug mode
- `npm run start:prod` - Start the application in production mode
- `npm run build` - Build the application
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:cov` - Run test coverage
- `npm run lint` - Lint the code
- `npm run format` - Format the code

## 🔐 Environment Variables

Required environment variables:

```env
# Application
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRATION=1d

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=your-region
AWS_BUCKET_NAME=your-bucket

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- Made with ♥ by [ThanhDev](https://www.facebook.com/thanh.vophuoc.50)

## 🙏 Acknowledgments

- NestJS team for the amazing framework
- All contributors who have helped shape this boilerplate
