import { Type } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';

import { AuthModule } from '@/modules/auth/auth.module';
import { HealthModule } from '@/modules/health/health.module';
import { RoleModule } from '@/modules/role/role.module';
import { UploadModule } from '@/modules/upload/upload.module';
import { UserModule } from '@/modules/user/user.module';

const APP_TITLE = 'Nestjs API';
const SWAGGER_PATH = 'docs';

interface SwaggerGroup {
  name: string; // label shown in the dropdown
  path: string; // sub-path under /docs
  modules: Type<unknown>[]; // module(s) fed into the spec via the `include` option
}

const SWAGGER_GROUPS: SwaggerGroup[] = [
  { name: 'Auth', path: 'auth', modules: [AuthModule] },
  { name: 'User', path: 'user', modules: [UserModule] },
  { name: 'Role', path: 'role', modules: [RoleModule] },
  { name: 'Upload', path: 'upload', modules: [UploadModule] },
  { name: 'Health', path: 'health', modules: [HealthModule] },
];

const buildBaseConfig = () =>
  new DocumentBuilder()
    .setTitle(APP_TITLE)
    .setDescription(`${APP_TITLE} API description`)
    .setVersion('1.0')
    .addBearerAuth()
    .build();

const baseUiOptions = (siteTitle: string): SwaggerCustomOptions => ({
  customSiteTitle: siteTitle,
  swaggerOptions: { persistAuthorization: true },
});

export const setupSwagger = (app: NestExpressApplication): void => {
  // 1) Full spec (all modules) — served at /docs-json
  const fullDocument = SwaggerModule.createDocument(app, buildBaseConfig());

  // Dropdown entries: "All modules" first, then each module.
  const urls: { url: string; name: string }[] = [
    { url: `/${SWAGGER_PATH}-json`, name: 'All modules' },
  ];

  // 2) Per module: one spec + one standalone UI at /docs/<path>
  for (const group of SWAGGER_GROUPS) {
    const document = SwaggerModule.createDocument(app, buildBaseConfig(), {
      include: group.modules,
    });
    const path = `${SWAGGER_PATH}/${group.path}`;

    SwaggerModule.setup(
      path,
      app,
      document,
      baseUiOptions(`Swagger | ${group.name}`),
    );

    urls.push({ url: `/${path}-json`, name: group.name });
  }

  // 3) Root UI at /docs with the explorer dropdown to switch between modules
  SwaggerModule.setup(SWAGGER_PATH, app, fullDocument, {
    ...baseUiOptions(`Swagger | ${APP_TITLE}`),
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
      urls,
      'urls.primaryName': 'All modules',
    },
  });
};
