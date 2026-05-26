import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method: string = req.method;
    const isWrite = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);

    return next.handle().pipe(
      tap(async (response) => {
        if (isWrite && req.user) {
          await this.prisma.auditLog
            .create({
              data: {
                userId: req.user.sub,
                action: `${method} ${req.route?.path ?? req.url}`,
                entity: extractEntity(req.route?.path ?? req.url),
                entityId: response?.id ?? null,
                payload: JSON.parse(JSON.stringify({
                  request: sanitize(req.body),
                  response: sanitize(response),
                })),
              },
            })
            .catch((err) => console.error('AuditLog failed:', err));
        }
      }),
    );
  }
}

function sanitize(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = { ...(obj as Record<string, unknown>) };
  for (const key of ['password', 'passwordHash', 'currentPassword', 'newPassword', 'refreshToken', 'accessToken']) {
    delete clone[key];
  }
  return clone;
}

function extractEntity(path: string): string {
  const segments = path.split('/').filter(Boolean);
  const segment = segments[2] ?? segments[0] ?? path;
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/s$/, '');
}
