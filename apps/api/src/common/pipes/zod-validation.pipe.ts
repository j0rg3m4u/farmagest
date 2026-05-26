import { PipeTransform, BadRequestException, Injectable } from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validação falhou',
        errors: result.error.flatten().fieldErrors,
      });
    }
    return result.data;
  }
}
