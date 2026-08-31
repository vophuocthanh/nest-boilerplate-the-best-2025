import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import * as request from 'supertest';

import { AppModule } from '../src/app.module';

/**
 * Cần DATABASE_URL trỏ tới một Postgres đang chạy (PrismaService.$connect chạy
 * trong onModuleInit).
 */
describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / trả thông tin service, bọc trong envelope chuẩn', async () => {
    const response = await request(app.getHttpServer()).get('/').expect(200);

    expect(response.body).toEqual({
      statusCode: 200,
      message: 'Success',
      data: {
        name: expect.any(String),
        version: expect.any(String),
        environment: expect.any(String),
      },
    });
  });

  it('route được bảo vệ trả 401 khi thiếu access token', async () => {
    await request(app.getHttpServer()).get('/api/user/me').expect(401);
  });
});
