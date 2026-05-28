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
          const path = req.route?.path ?? req.url;
          await this.prisma.auditLog
            .create({
              data: {
                userId: req.user.sub,
                sectorId: req.user.sectorId ?? null,
                action: methodToAction(method, path),
                entity: extractEntity(path),
                entityId: response?.id ?? extractEntityId(req.params),
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

function methodToAction(method: string, path: string): string {
  if (method === 'DELETE') return 'DELETE';
  if (method === 'PATCH' || method === 'PUT') return 'UPDATE';
  if (method === 'POST') {
    if (path.includes('/reversal')) return 'REVERSAL';
    if (path.includes('/execute')) return 'EXECUTE';
    if (path.includes('/mark-ready')) return 'MARK_READY';
    if (path.includes('/cancel')) return 'CANCEL';
    if (path.includes('/approve')) return 'APPROVE';
    if (path.includes('/reject')) return 'REJECT';
    return 'CREATE';
  }
  return method;
}

function extractEntityId(params: Record<string, string> | undefined): string | null {
  if (!params) return null;
  return params['id'] ?? params['itemId'] ?? null;
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
