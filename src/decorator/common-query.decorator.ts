import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

export function CommonQuery(
  name: string,
  description: string,
  enumValues?: string[],
) {
  return applyDecorators(
    ApiQuery({
      name: name,
      required: false,
      enum: enumValues,
      description: description,
    }),
  );
}
