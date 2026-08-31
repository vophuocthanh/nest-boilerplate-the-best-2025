#!/usr/bin/env node
/* eslint-disable */
/**
 * Module generator – tạo nhanh một CRUD module theo đúng kiến trúc của dự án.
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
 * Mỗi lần chạy sẽ tạo trong src/modules/<ten> đủ 5 tầng của kiến trúc:
 *   - <ten>.controller.ts   route + DTO + Swagger, KHÔNG chứa logic
 *   - <ten>.service.ts      nghiệp vụ, trả DTO thô (envelope do interceptor lo)
 *   - <ten>.repository.ts   nơi DUY NHẤT chạm bảng của aggregate này
 *   - <ten>.mapper.ts       entity -> DTO, whitelist field
 *   - <ten>.constants.ts    whitelist sortBy
 *   - <ten>.module.ts
 *   - dto/{create,update,<ten>-response}.dto.ts
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
const constName = w.map((x) => x.toUpperCase()).join('_'); // PRODUCT_CATEGORY

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
  name!: string;

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

const responseDto = `import { ApiProperty } from '@nestjs/swagger';

/** Hình dạng ${kebab} trả ra client. Chỉ khai báo field thực sự muốn lộ ra. */
export class ${pascal}Dto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  status!: number | null;

  @ApiProperty()
  createAt!: Date;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  updateAt!: Date | null;
}
`;

const constants = `/** Field được phép dùng cho \`sortBy\` khi liệt kê ${kebab}. */
export const ${constName}_SORT_FIELDS = ['createAt', 'updateAt', 'name'] as const;
`;

const mapper = `import { ${pascal} } from '@prisma/client';

import { ${pascal}Dto } from './dto/${kebab}-response.dto';

/**
 * Nguồn sự thật DUY NHẤT cho hình dạng ${kebab} trả ra client.
 *
 * Đây là WHITELIST: thêm field nhạy cảm vào schema sẽ mặc định KHÔNG lộ ra.
 */
export function to${pascal}Dto(entity: ${pascal}): ${pascal}Dto {
  return {
    id: entity.id,
    name: entity.name,
    description: entity.description,
    status: entity.status,
    createAt: entity.createAt,
    updateAt: entity.updateAt,
  };
}
`;

const repository = `import { Injectable } from '@nestjs/common';

import { Prisma, ${pascal} } from '@prisma/client';

import { PrismaService } from '@/core/database/prisma.service';
import { paginate } from '@/shared/pagination/paginate';
import { Paginated } from '@/shared/pagination/paginated';
import { PaginationParams } from '@/shared/pagination/pagination-params';

import { ${constName}_SORT_FIELDS } from './${kebab}.constants';

/** Nơi DUY NHẤT truy vấn bảng \`${table}\`. */
@Injectable()
export class ${pascal}Repository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.${pascal}CreateInput): Promise<${pascal}> {
    return this.prisma.${camel}.create({ data });
  }

  findById(id: string): Promise<${pascal} | null> {
    return this.prisma.${camel}.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.${pascal}UpdateInput): Promise<${pascal}> {
    return this.prisma.${camel}.update({ where: { id }, data });
  }

  delete(id: string): Promise<${pascal}> {
    return this.prisma.${camel}.delete({ where: { id } });
  }

  paginate(params: PaginationParams): Promise<Paginated<${pascal}>> {
    const where: Prisma.${pascal}WhereInput = params.search
      ? { name: { contains: params.search, mode: 'insensitive' } }
      : {};

    return paginate<${pascal}, Prisma.${pascal}WhereInput>(
      this.prisma.${camel},
      params,
      {
        where,
        allowedSortFields: ${constName}_SORT_FIELDS,
        defaultSortField: 'createAt',
      },
    );
  }
}
`;

const service = `import { Injectable, NotFoundException } from '@nestjs/common';

import { Paginated } from '@/shared/pagination/paginated';
import { PaginationParams } from '@/shared/pagination/pagination-params';

import { Create${pascal}Dto } from './dto/create-${kebab}.dto';
import { Update${pascal}Dto } from './dto/update-${kebab}.dto';
import { ${pascal}Dto } from './dto/${kebab}-response.dto';
import { to${pascal}Dto } from './${kebab}.mapper';
import { ${pascal}Repository } from './${kebab}.repository';

/**
 * Trả về DỮ LIỆU THÔ (DTO), không tự bọc { data, message }.
 * Envelope response do TransformInterceptor tạo; message khai báo bằng
 * @ResponseMessage() ở controller.
 */
@Injectable()
export class ${pascal}Service {
  constructor(private readonly ${camel}Repository: ${pascal}Repository) {}

  async create(data: Create${pascal}Dto): Promise<${pascal}Dto> {
    return to${pascal}Dto(await this.${camel}Repository.create(data));
  }

  getAll(params: PaginationParams): Promise<Paginated<${pascal}Dto>> {
    return this.${camel}Repository.paginate(params).then((page) => ({
      items: page.items.map(to${pascal}Dto),
      meta: page.meta,
    }));
  }

  async getDetail(id: string): Promise<${pascal}Dto> {
    return to${pascal}Dto(await this.findOrFail(id));
  }

  async update(id: string, data: Update${pascal}Dto): Promise<${pascal}Dto> {
    await this.findOrFail(id);
    return to${pascal}Dto(await this.${camel}Repository.update(id, data));
  }

  async remove(id: string): Promise<void> {
    await this.findOrFail(id);
    await this.${camel}Repository.delete(id);
  }

  private async findOrFail(id: string) {
    const entity = await this.${camel}Repository.findById(id);
    if (!entity) {
      throw new NotFoundException('${pascal} không tồn tại');
    }
    return entity;
  }
}
`;

const controller = `import {
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ApiCommonResponses } from '@/shared/decorators/api-common-responses.decorator';
import { AuthenticatedController } from '@/shared/decorators/authenticated-controller.decorator';
import { CommonPagination } from '@/shared/decorators/common-pagination.decorator';
import { Pagination } from '@/shared/decorators/pagination.decorator';
import { ResponseMessage } from '@/shared/decorators/response-message.decorator';
import { Paginated } from '@/shared/pagination/paginated';
import { PaginationParams } from '@/shared/pagination/pagination-params';

import { Create${pascal}Dto } from './dto/create-${kebab}.dto';
import { Update${pascal}Dto } from './dto/update-${kebab}.dto';
import { ${pascal}Dto } from './dto/${kebab}-response.dto';
import { ${constName}_SORT_FIELDS } from './${kebab}.constants';
import { ${pascal}Service } from './${kebab}.service';

// JwtAuthGuard là global (@Public() để mở route công khai) -> không cần @UseGuards.
@ApiTags('${pascal}')
@AuthenticatedController('${kebab}')
export class ${pascal}Controller {
  constructor(private readonly ${camel}Service: ${pascal}Service) {}

  @Post()
  @ApiCommonResponses('Tạo mới ${kebab}')
  @ResponseMessage('Tạo ${kebab} thành công')
  create(@Body() data: Create${pascal}Dto): Promise<${pascal}Dto> {
    return this.${camel}Service.create(data);
  }

  @Get()
  @ApiCommonResponses('Lấy danh sách ${kebab}')
  @CommonPagination(${constName}_SORT_FIELDS)
  getAll(
    @Pagination() params: PaginationParams,
  ): Promise<Paginated<${pascal}Dto>> {
    return this.${camel}Service.getAll(params);
  }

  @Get(':id')
  @ApiCommonResponses('Lấy chi tiết ${kebab}')
  getDetail(@Param('id') id: string): Promise<${pascal}Dto> {
    return this.${camel}Service.getDetail(id);
  }

  @Put(':id')
  @ApiCommonResponses('Cập nhật ${kebab}')
  @ResponseMessage('Cập nhật ${kebab} thành công')
  update(
    @Param('id') id: string,
    @Body() data: Update${pascal}Dto,
  ): Promise<${pascal}Dto> {
    return this.${camel}Service.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiCommonResponses('Xóa ${kebab}')
  @ResponseMessage('Xóa ${kebab} thành công')
  remove(@Param('id') id: string): Promise<void> {
    return this.${camel}Service.remove(id);
  }
}
`;

const moduleFile = `import { Module } from '@nestjs/common';

import { ${pascal}Controller } from './${kebab}.controller';
import { ${pascal}Repository } from './${kebab}.repository';
import { ${pascal}Service } from './${kebab}.service';

// PrismaService đến từ PrismaModule (@Global) -> không khai báo lại ở đây,
// tránh tạo instance trùng lặp.
@Module({
  controllers: [${pascal}Controller],
  providers: [${pascal}Service, ${pascal}Repository],
  // Mở export khi module khác cần chạm aggregate này (đi qua repository).
  exports: [${pascal}Repository],
})
export class ${pascal}Module {}
`;

// ---------- write files ----------
fs.mkdirSync(dtoDir, { recursive: true });

const files = [
  [path.join(moduleDir, `${kebab}.controller.ts`), controller],
  [path.join(moduleDir, `${kebab}.service.ts`), service],
  [path.join(moduleDir, `${kebab}.repository.ts`), repository],
  [path.join(moduleDir, `${kebab}.mapper.ts`), mapper],
  [path.join(moduleDir, `${kebab}.constants.ts`), constants],
  [path.join(moduleDir, `${kebab}.module.ts`), moduleFile],
  [path.join(dtoDir, `create-${kebab}.dto.ts`), createDto],
  [path.join(dtoDir, `update-${kebab}.dto.ts`), updateDto],
  [path.join(dtoDir, `${kebab}-response.dto.ts`), responseDto],
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
