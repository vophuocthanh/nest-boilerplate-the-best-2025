#!/usr/bin/env node
/* eslint-disable */
/**
 * Module generator – tạo nhanh một CRUD module theo đúng convention của dự án.
 *
 * Cách dùng:
 *   pnpm gen <ten-module>
 *   pnpm gen product
 *   pnpm gen product-category
 *
 * Cờ tuỳ chọn:
 *   --no-model      Không thêm model vào prisma/schema.prisma
 *   --no-register   Không tự đăng ký module vào src/app.module.ts
 *
 * Mỗi lần chạy sẽ tạo trong src/modules/<ten>:
 *   - <ten>.controller.ts   (CRUD: create / getAll(pagination) / getDetail / update / remove)
 *   - <ten>.service.ts      (dùng PrismaService + ResponseUtil)
 *   - <ten>.module.ts
 *   - dto/create-<ten>.dto.ts   (sẵn các trường: name, description, status)
 *   - dto/update-<ten>.dto.ts   (PartialType)
 *   - dto/<ten>.dto.ts          (filter + response type)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MODULES_DIR = path.join(ROOT, 'src', 'modules');
const APP_MODULE = path.join(ROOT, 'src', 'app.module.ts');
const PRISMA_SCHEMA = path.join(ROOT, 'prisma', 'schema.prisma');

// ---------- helpers ----------
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const nameArg = args.find((a) => !a.startsWith('--'));

if (!nameArg) {
  console.error('❌  Thiếu tên module.\n   Ví dụ: pnpm gen product');
  process.exit(1);
}

function words(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function pluralize(word) {
  if (/[^aeiou]y$/.test(word)) return word.slice(0, -1) + 'ies';
  if (/(s|x|z|ch|sh)$/.test(word)) return word + 'es';
  return word + 's';
}

const w = words(nameArg);
const pascal = w.map(cap).join(''); // ProductCategory
const camel = pascal.charAt(0).toLowerCase() + pascal.slice(1); // productCategory
const kebab = w.join('-'); // product-category
const snake = w.join('_'); // product_category
const table = pluralize(snake); // product_categories

const moduleDir = path.join(MODULES_DIR, kebab);
const dtoDir = path.join(moduleDir, 'dto');

if (fs.existsSync(moduleDir)) {
  console.error(`❌  Module đã tồn tại: src/modules/${kebab}`);
  process.exit(1);
}

// ---------- templates ----------
const createDto = `import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class Create${pascal}Dto {
  @ApiProperty({ description: 'Tên', example: 'Example name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ required: false, description: 'Mô tả' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: 'Trạng thái', example: 1 })
  @IsOptional()
  @IsInt()
  status?: number;
}
`;

const updateDto = `import { PartialType } from '@nestjs/swagger';

import { Create${pascal}Dto } from './create-${kebab}.dto';

export class Update${pascal}Dto extends PartialType(Create${pascal}Dto) {}
`;

const filterDto = `import { ${pascal} } from '@prisma/client';

import { PaginationResponse } from '@app/src/core/model/pagination-response';

export class ${pascal}FilterDto {
  search?: string;
}

export type ${pascal}PaginationResponse = PaginationResponse<${pascal}[]>;
`;

const controller = `import {
  Body,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ApiCommonResponses } from 'src/decorator/api-common-responses.decorator';
import { AuthenticatedController } from 'src/decorator/authenticated-controller.decorator';
import { CommonPagination } from 'src/decorator/common-pagination.decorator';
import { CommonQuery } from 'src/decorator/common-query.decorator';

import { PaginationParams } from '@app/src/core/model/pagination-params';
import { Pagination } from '@app/src/decorator/pagination.decorator';
import { HandleAuthGuard } from '@app/src/modules/auth/guard/auth.guard';

import { Create${pascal}Dto } from './dto/create-${kebab}.dto';
import { Update${pascal}Dto } from './dto/update-${kebab}.dto';
import { ${pascal}Service } from './${kebab}.service';

@ApiTags('${pascal}')
@AuthenticatedController('${kebab}')
export class ${pascal}Controller {
  constructor(private readonly ${camel}Service: ${pascal}Service) {}

  @UseGuards(HandleAuthGuard)
  @Post()
  @ApiCommonResponses('Tạo mới ${kebab}')
  create(@Body() data: Create${pascal}Dto) {
    return this.${camel}Service.create(data);
  }

  @UseGuards(HandleAuthGuard)
  @CommonQuery('sort', 'Sort order (asc or desc)', ['asc', 'desc'])
  @CommonQuery('sortBy', 'Field to sort by', ['createAt'])
  @CommonPagination()
  @Get()
  @ApiCommonResponses('Lấy danh sách ${kebab}')
  getAll(@Pagination(['sortBy']) params: PaginationParams) {
    return this.${camel}Service.getAll(params);
  }

  @UseGuards(HandleAuthGuard)
  @Get(':id')
  @ApiCommonResponses('Lấy chi tiết ${kebab}')
  getDetail(@Param('id') id: string) {
    return this.${camel}Service.getDetail(id);
  }

  @UseGuards(HandleAuthGuard)
  @Put(':id')
  @ApiCommonResponses('Cập nhật ${kebab}')
  update(@Param('id') id: string, @Body() data: Update${pascal}Dto) {
    return this.${camel}Service.update(id, data);
  }

  @UseGuards(HandleAuthGuard)
  @Delete(':id')
  @ApiCommonResponses('Xóa ${kebab}')
  remove(@Param('id') id: string) {
    return this.${camel}Service.remove(id);
  }
}
`;

const service = `import { Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PaginationParams } from '@app/src/core/model/pagination-params';
import { PrismaService } from '@app/src/helpers/prisma.service';
import { ResponseUtil } from '@app/src/utils/response.util';

import { Create${pascal}Dto } from './dto/create-${kebab}.dto';
import { Update${pascal}Dto } from './dto/update-${kebab}.dto';

@Injectable()
export class ${pascal}Service {
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: Create${pascal}Dto) {
    const ${camel} = await this.prismaService.${camel}.create({ data });
    return ResponseUtil.success(${camel}, 'Tạo ${kebab} thành công');
  }

  async getAll(pagination: PaginationParams) {
    const { itemsPerPage, skip, search, page, sort, sortBy } = pagination;

    const where: Prisma.${pascal}WhereInput = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' } }] }
      : {};

    const orderBy: Prisma.${pascal}OrderByWithRelationInput =
      sort && sortBy ? { [sortBy as string]: sort } : { createAt: 'desc' };

    const data = await this.prismaService.${camel}.findMany({
      where,
      skip,
      take: itemsPerPage,
      orderBy,
    });

    const total = await this.prismaService.${camel}.count({ where });

    return ResponseUtil.paginate(data, total, page, itemsPerPage);
  }

  async getDetail(id: string) {
    const ${camel} = await this.prismaService.${camel}.findUnique({
      where: { id },
    });

    if (!${camel}) {
      throw new NotFoundException('${pascal} không tồn tại');
    }

    return ResponseUtil.success(${camel}, 'Lấy chi tiết ${kebab} thành công');
  }

  async update(id: string, data: Update${pascal}Dto) {
    await this.getDetail(id);

    const ${camel} = await this.prismaService.${camel}.update({
      where: { id },
      data,
    });

    return ResponseUtil.success(${camel}, 'Cập nhật ${kebab} thành công');
  }

  async remove(id: string) {
    await this.getDetail(id);

    await this.prismaService.${camel}.delete({ where: { id } });

    return { message: 'Xóa ${kebab} thành công' };
  }
}
`;

const moduleFile = `import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '@app/src/helpers/prisma.service';

import { ${pascal}Controller } from './${kebab}.controller';
import { ${pascal}Service } from './${kebab}.service';

@Module({
  controllers: [${pascal}Controller],
  providers: [${pascal}Service, PrismaService, JwtService],
})
export class ${pascal}Module {}
`;

// ---------- write files ----------
fs.mkdirSync(dtoDir, { recursive: true });

const files = [
  [path.join(moduleDir, `${kebab}.controller.ts`), controller],
  [path.join(moduleDir, `${kebab}.service.ts`), service],
  [path.join(moduleDir, `${kebab}.module.ts`), moduleFile],
  [path.join(dtoDir, `create-${kebab}.dto.ts`), createDto],
  [path.join(dtoDir, `update-${kebab}.dto.ts`), updateDto],
  [path.join(dtoDir, `${kebab}.dto.ts`), filterDto],
];

files.forEach(([file, content]) => {
  fs.writeFileSync(file, content);
  console.log(`✅  CREATE  ${path.relative(ROOT, file)}`);
});

// ---------- register vào app.module.ts ----------
if (!flags.has('--no-register') && fs.existsSync(APP_MODULE)) {
  let app = fs.readFileSync(APP_MODULE, 'utf8');
  const importLine = `import { ${pascal}Module } from './modules/${kebab}/${kebab}.module';`;

  if (!app.includes(importLine)) {
    app = app.replace(/\n@Module\(/, `\n${importLine}\n\n@Module(`);
    app = app.replace(/imports:\s*\[\n/, (m) => `${m}    ${pascal}Module,\n`);
    fs.writeFileSync(APP_MODULE, app);
    console.log(`✅  UPDATE  ${path.relative(ROOT, APP_MODULE)} (đăng ký ${pascal}Module)`);
  }
}

// ---------- thêm model vào prisma schema ----------
let modelAdded = false;
if (!flags.has('--no-model') && fs.existsSync(PRISMA_SCHEMA)) {
  let schema = fs.readFileSync(PRISMA_SCHEMA, 'utf8');
  const exists = new RegExp(`model\\s+${pascal}\\s*\\{`).test(schema);

  if (!exists) {
    const model = `
model ${pascal} {
  id          String    @id @default(uuid())
  name        String
  description String?
  status      Int?      @default(1)
  createAt    DateTime  @default(now())
  updateAt    DateTime? @updatedAt

  @@map("${table}")
}
`;
    fs.writeFileSync(PRISMA_SCHEMA, schema.replace(/\s*$/, '\n') + model);
    modelAdded = true;
    console.log(`✅  UPDATE  prisma/schema.prisma (thêm model ${pascal})`);
  }
}

// ---------- next steps ----------
console.log(`\n🎉  Đã tạo module "${kebab}" trong src/modules/${kebab}\n`);
if (modelAdded) {
  console.log('👉  Bước tiếp theo (vì vừa thêm model Prisma mới):');
  console.log('    pnpm exec prisma migrate dev --name add_' + snake);
  console.log('    pnpm exec prisma generate\n');
}
