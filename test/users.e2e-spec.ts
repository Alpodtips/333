import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let createdUserId: number;
  const email = `e2e-${Date.now()}@example.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    app.enableVersioning({ type: VersioningType.URI, prefix: 'v' });
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }));
    await app.init();
  });

  afterAll(async () => {
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } }).catch(() => undefined);
    }
    await app.close();
  });

  it('reports API and database health', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ok');
        expect(body.database).toBe('up');
      });
  });

  it('creates a user without exposing the password', () => {
    return request(app.getHttpServer())
      .post('/v1/users')
      .send({ email, name: 'E2E User', password: 'password123' })
        .expect(201)
        .then((response) => {
          createdUserId = response.body.id;
          expect(response.body.email).toBe(email);
          expect(response.body.password).toBeUndefined();
        });
  });

  it('rejects protected access without authentication', () => {
    return request(app.getHttpServer())
      .get('/v1/users')
      .expect(401);
  });

  it('authenticates a verified user and allows profile access', async () => {
    await prisma.user.update({ where: { id: createdUserId }, data: { emailVerified: true } });
    const loginResponse = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);

    accessToken = loginResponse.body.access_token;
    expect(accessToken).toEqual(expect.any(String));
    await request(app.getHttpServer())
      .get('/v1/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toHaveLength(1);
        expect(body.data[0].id).toBe(createdUserId);
        expect(body.meta.total).toBe(1);
      });
  });

  it('rotates the refresh token', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);
    const refreshToken = loginResponse.body.refresh_token;
    const refreshResponse = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refresh_token: refreshToken })
      .expect(200);

    expect(refreshResponse.body.refresh_token).toEqual(expect.any(String));
    expect(refreshResponse.body.refresh_token).not.toBe(refreshToken);
    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refresh_token: refreshToken })
      .expect(401);
  });
});
