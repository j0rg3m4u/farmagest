# Sprint 1 — Autenticação, Usuários e Unidades

## Objetivo

Entregar o **alicerce funcional do FarmaGest**:

- Login funcional com JWT para os 4 perfis (Coordenação, Administrativo, Auxiliar, Unidade)
- CRUD de Usuários (restrito por perfil)
- CRUD de Unidades de saúde
- Layout autenticado completo (sidebar + header conforme mockup)
- Seed inicial com dados fictícios realistas de Duque de Caxias
- Tudo deployado em `dev.farmagest.nodelab.com.br` para validação com a Marylyn

Ao final da sprint, a cliente pode logar no sistema, navegar entre as telas, cadastrar uma unidade e um usuário. Não tem ainda funcionalidades de estoque (isso é Sprint 2+) — mas o esqueleto navegacional e de segurança está em pé.

## Duração estimada

**2 semanas**, dividas em 5 fases:

| Fase | Foco | Tempo |
|---|---|---|
| 1.1 | Schema Prisma + tipos no shared + seed | 2 dias |
| 1.2 | Autenticação JWT (back) | 2 dias |
| 1.3 | CRUD de Usuários e Unidades (back) | 3 dias |
| 1.4 | Tela de login + layout autenticado (front) | 2 dias |
| 1.5 | Telas de Usuários e Unidades (front) | 3 dias |

**Validação contínua:** cada fase deve ser testada localmente antes de seguir. Não pule fases.

---

## Pré-requisitos

Antes de começar:

- [ ] Sprint 0 concluída e validada (`dev.farmagest.nodelab.com.br` mostrando "API conectada")
- [ ] Branch `dev` sincronizada local e remota
- [ ] PostgreSQL local rodando (`pnpm db:up`)
- [ ] `pnpm doctor` verde

---

## Fase 1.1 — Schema, tipos e seed

### Objetivo
Modelar `User`, `Unit`, `RefreshToken`, `AuditLog` no Prisma. Espelhar enums e types no `@farmagest/shared`. Criar seed inicial com dados fictícios de Duque de Caxias.

### Tarefas

#### 1.1.1 — Adicionar enums e tipos ao `@farmagest/shared`

Em `packages/shared/src/enums/`, criar (se ainda não existirem):

**`user-role.ts`** (já criado na Sprint 0, confirmar conteúdo):
```typescript
export enum UserRole {
  COORDINATION = 'COORDINATION',
  ADMIN = 'ADMIN',
  ASSISTANT = 'ASSISTANT',
  UNIT = 'UNIT',
  MANAGER = 'MANAGER',
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.COORDINATION]: 'Coordenação',
  [UserRole.ADMIN]: 'Administrativo',
  [UserRole.ASSISTANT]: 'Auxiliar',
  [UserRole.UNIT]: 'Unidade',
  [UserRole.MANAGER]: 'Gestor',
};
```

**`unit-type.ts`** (novo):
```typescript
export enum UnitType {
  UBS = 'UBS',
  UPA = 'UPA',
  HOSPITAL = 'HOSPITAL',
  CAPS = 'CAPS',
  OTHER = 'OTHER',
}

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  [UnitType.UBS]: 'UBS',
  [UnitType.UPA]: 'UPA',
  [UnitType.HOSPITAL]: 'Hospital',
  [UnitType.CAPS]: 'CAPS',
  [UnitType.OTHER]: 'Outra',
};
```

Atualize `packages/shared/src/enums/index.ts` para exportar ambos.

#### 1.1.2 — Adicionar types e schemas Zod

Em `packages/shared/src/types/`, criar:

**`user.ts`:**
```typescript
import { UserRole } from '../enums';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  unitId: string | null;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**`unit.ts`:**
```typescript
import { UnitType } from '../enums';

export interface Unit {
  id: string;
  name: string;
  type: UnitType;
  address: string | null;
  responsible: string;
  contact: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**`auth.ts`:**
```typescript
import { User } from './user';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface JwtPayload {
  sub: string;       // userId
  email: string;
  role: string;
  unitId: string | null;
  iat?: number;
  exp?: number;
}
```

Atualize `packages/shared/src/types/index.ts`.

#### 1.1.3 — Schemas Zod compartilhados

Em `packages/shared/src/schemas/`, criar:

**`auth.schema.ts`:**
```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
```

**`user.schema.ts`:**
```typescript
import { z } from 'zod';
import { UserRole } from '../enums';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(120),
  email: z.string().email('E-mail inválido').max(180),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres').max(72),
  role: z.nativeEnum(UserRole, { errorMap: () => ({ message: 'Perfil inválido' }) }),
  unitId: z.string().cuid().nullable().optional(),
});

export const updateUserSchema = createUserSchema
  .omit({ password: true })
  .partial()
  .extend({
    active: z.boolean().optional(),
  });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
```

**`unit.schema.ts`:**
```typescript
import { z } from 'zod';
import { UnitType } from '../enums';

export const createUnitSchema = z.object({
  name: z.string().min(2).max(180),
  type: z.nativeEnum(UnitType),
  address: z.string().max(300).nullable().optional(),
  responsible: z.string().min(2).max(120),
  contact: z.string().max(60).nullable().optional(),
});

export const updateUnitSchema = createUnitSchema.partial().extend({
  active: z.boolean().optional(),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
```

Criar `packages/shared/src/schemas/index.ts` exportando tudo. Atualizar `packages/shared/src/index.ts` para incluir schemas.

#### 1.1.4 — Schema Prisma

Em `apps/api/prisma/schema.prisma`, **substituir** o modelo `AppMeta` placeholder pelos modelos reais:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  COORDINATION
  ADMIN
  ASSISTANT
  UNIT
  MANAGER
}

enum UnitType {
  UBS
  UPA
  HOSPITAL
  CAPS
  OTHER
}

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  passwordHash  String
  role          UserRole
  unitId        String?
  unit          Unit?     @relation(fields: [unitId], references: [id])
  active        Boolean   @default(true)
  lastLoginAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  refreshTokens RefreshToken[]
  auditLogs     AuditLog[]

  @@index([email])
  @@index([unitId])
}

model RefreshToken {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String    @unique
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
  @@index([token])
}

model Unit {
  id          String   @id @default(cuid())
  name        String
  type        UnitType
  address     String?
  responsible String
  contact     String?
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  users       User[]

  @@index([name])
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  action    String
  entity    String
  entityId  String?
  payload   Json
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([entity, entityId])
  @@index([createdAt])
}
```

Criar a migration:
```bash
pnpm --filter @farmagest/api exec prisma migrate dev --name sprint1_auth_users_units
```

#### 1.1.5 — Seed com dados de Duque de Caxias

Em `apps/api/prisma/seed.ts`:

```typescript
import { PrismaClient, UserRole, UnitType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Limpar dados existentes (cuidado em produção — só dev)
  await prisma.refreshToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.unit.deleteMany();

  // ============ UNIDADES DE SAÚDE ============
  // Mistura de UBSs reais e fictícias de Duque de Caxias
  const unidades = await Promise.all([
    prisma.unit.create({
      data: {
        name: 'UBS Jardim Primavera',
        type: UnitType.UBS,
        address: 'Rua das Acácias, 145 — Jardim Primavera, Duque de Caxias/RJ',
        responsible: 'Ana Paula Ribeiro',
        contact: '(21) 2671-1100',
      },
    }),
    prisma.unit.create({
      data: {
        name: 'UBS Imbariê',
        type: UnitType.UBS,
        address: 'Av. Brasil, 2890 — Imbariê, Duque de Caxias/RJ',
        responsible: 'Roberto Carlos Souza',
        contact: '(21) 2671-1200',
      },
    }),
    prisma.unit.create({
      data: {
        name: 'UBS Pilar',
        type: UnitType.UBS,
        address: 'Rua Beira-Mar, 78 — Pilar, Duque de Caxias/RJ',
        responsible: 'Maria Aparecida Santos',
        contact: '(21) 2671-1300',
      },
    }),
    prisma.unit.create({
      data: {
        name: 'UPA Centro',
        type: UnitType.UPA,
        address: 'Praça Dom Pedro II, s/n — Centro, Duque de Caxias/RJ',
        responsible: 'Dr. Fernando Almeida',
        contact: '(21) 2671-2000',
      },
    }),
    prisma.unit.create({
      data: {
        name: 'UPA Saracuruna',
        type: UnitType.UPA,
        address: 'Rua João Mendes, 540 — Saracuruna, Duque de Caxias/RJ',
        responsible: 'Dra. Cristina Pereira',
        contact: '(21) 2671-2100',
      },
    }),
    prisma.unit.create({
      data: {
        name: 'Hospital Municipal Moacyr do Carmo',
        type: UnitType.HOSPITAL,
        address: 'Av. Presidente Vargas, 1100 — Centro, Duque de Caxias/RJ',
        responsible: 'Dr. Eduardo Nogueira',
        contact: '(21) 2671-3000',
      },
    }),
    prisma.unit.create({
      data: {
        name: 'CAPS II Caxias',
        type: UnitType.CAPS,
        address: 'Rua Ipiranga, 232 — Centro, Duque de Caxias/RJ',
        responsible: 'Patrícia Vieira',
        contact: '(21) 2671-4000',
      },
    }),
  ]);

  console.log(`✓ ${unidades.length} unidades criadas`);

  // ============ USUÁRIOS ============
  const passwordHash = await bcrypt.hash('FarmaGest@2026', 10);

  // Coordenação — Marylyn (a cliente)
  await prisma.user.create({
    data: {
      name: 'Marylyn Macedo',
      email: 'marylyn@duquedecaxias.rj.gov.br',
      passwordHash,
      role: UserRole.COORDINATION,
    },
  });

  // Coordenação adicional (para testes de múltiplos coordenadores)
  await prisma.user.create({
    data: {
      name: 'Ricardo Mendes',
      email: 'ricardo.coordenacao@duquedecaxias.rj.gov.br',
      passwordHash,
      role: UserRole.COORDINATION,
    },
  });

  // Administrativo
  await prisma.user.create({
    data: {
      name: 'Lucia Ferreira',
      email: 'lucia.admin@duquedecaxias.rj.gov.br',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  // Auxiliares (sem unidade — operam no almoxarifado central)
  await prisma.user.create({
    data: {
      name: 'Carlos Silva',
      email: 'carlos.aux@duquedecaxias.rj.gov.br',
      passwordHash,
      role: UserRole.ASSISTANT,
    },
  });
  await prisma.user.create({
    data: {
      name: 'Joana Oliveira',
      email: 'joana.aux@duquedecaxias.rj.gov.br',
      passwordHash,
      role: UserRole.ASSISTANT,
    },
  });

  // Usuários por unidade
  for (const unidade of unidades) {
    const slug = unidade.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.|\.$/g, '');

    await prisma.user.create({
      data: {
        name: `Responsável ${unidade.name}`,
        email: `${slug}@duquedecaxias.rj.gov.br`,
        passwordHash,
        role: UserRole.UNIT,
        unitId: unidade.id,
      },
    });
  }

  console.log('✓ Usuários criados');
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('Login da Marylyn (coordenadora):');
  console.log('  email:  marylyn@duquedecaxias.rj.gov.br');
  console.log('  senha:  FarmaGest@2026');
  console.log('═══════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Adicionar no `apps/api/package.json`:
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

Garantir que `ts-node` está como dev dependency:
```bash
pnpm --filter @farmagest/api add -D ts-node @types/bcrypt
```

#### 1.1.6 — Validação da Fase 1.1

```bash
pnpm db:reset    # roda migrate + seed
pnpm db:studio   # abre o Prisma Studio
```

Conferir no Studio:
- 7 unidades cadastradas
- 12 usuários cadastrados (2 coordenação, 1 admin, 2 auxiliares, 7 unidades)
- Marylyn com perfil `COORDINATION`

✅ **Checkpoint da Fase 1.1:** dados estão no banco, navegáveis via Prisma Studio.

---

## Fase 1.2 — Autenticação JWT

### Objetivo
Implementar login/refresh/logout no backend. Endpoints protegidos por JWT. Guards de perfil funcionando.

### Tarefas

#### 1.2.1 — Módulo Auth

Criar a estrutura em `apps/api/src/modules/auth/`:

```
auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   └── jwt.strategy.ts
├── guards/
│   ├── jwt.guard.ts
│   └── roles.guard.ts
└── decorators/
    ├── roles.decorator.ts
    └── current-user.decorator.ts
```

#### 1.2.2 — Endpoints

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| POST | `/auth/login` | Login com email/senha → retorna access + refresh + user | público |
| POST | `/auth/refresh` | Troca refresh token por novo access | público |
| POST | `/auth/logout` | Invalida refresh token | JWT |
| GET | `/auth/me` | Retorna dados do usuário autenticado | JWT |

#### 1.2.3 — Regras

- **Hash de senha:** bcrypt cost 10
- **Access token:** 15 minutos, payload `{ sub, email, role, unitId }`
- **Refresh token:** 7 dias, salvo na tabela `RefreshToken` (não JWT, é uma string aleatória)
- **Logout:** marca `revokedAt` no refresh token
- **lastLoginAt:** atualiza a cada login bem-sucedido
- **Login com usuário inativo (`active: false`)** retorna 403, não 401
- **Login com email inexistente ou senha errada:** retorna 401 com mensagem **genérica** ("Credenciais inválidas"), nunca diferenciar entre "email não existe" e "senha errada" (segurança contra enumeração)

#### 1.2.4 — Pipe Zod global

Criar `apps/api/src/common/pipes/zod-validation.pipe.ts` conforme padrão do skill `nestjs-backend`:

```typescript
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
```

Uso nos controllers:
```typescript
@Post('login')
async login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginInput) {
  return this.authService.login(dto);
}
```

#### 1.2.5 — Decorators

`@Roles(...)` recebe roles e usa metadata. `RolesGuard` lê e valida contra o `request.user.role`.

```typescript
// roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@farmagest/shared';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

```typescript
// current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '@farmagest/shared';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    return ctx.switchToHttp().getRequest().user;
  },
);
```

#### 1.2.6 — Configuração JWT

No `auth.module.ts`:

```typescript
JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret: config.getOrThrow('JWT_SECRET'),
    signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '15m') },
  }),
}),
```

#### 1.2.7 — Testes manuais (curl)

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"marylyn@duquedecaxias.rj.gov.br","password":"FarmaGest@2026"}'

# Esperado: { accessToken, refreshToken, user: { id, name, email, role, ... } }

# Endpoint protegido
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <accessToken>"

# Esperado: dados do usuário

# Login com senha errada
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"marylyn@duquedecaxias.rj.gov.br","password":"errada"}'

# Esperado: 401 "Credenciais inválidas"
```

✅ **Checkpoint da Fase 1.2:** os 4 fluxos (login, refresh, logout, me) funcionam via curl.

---

## Fase 1.3 — CRUD de Usuários e Unidades

### Objetivo
Endpoints REST completos para gestão de usuários e unidades, respeitando perfis.

### Tarefas

#### 1.3.1 — Módulo Users

Em `apps/api/src/modules/users/`:

| Método | Rota | Quem pode |
|---|---|---|
| GET | `/users` | COORDINATION, MANAGER |
| GET | `/users/:id` | COORDINATION, MANAGER, ou o próprio usuário |
| POST | `/users` | COORDINATION |
| PATCH | `/users/:id` | COORDINATION |
| DELETE | `/users/:id` | COORDINATION (soft delete) |
| POST | `/users/:id/change-password` | o próprio usuário ou COORDINATION |

**Regras:**
- Listagem paginada (default 20, max 100), com filtros: `?role=`, `?unitId=`, `?active=`, `?search=` (busca em nome/email)
- Resposta nunca expõe `passwordHash`
- Email único (validar no service antes de criar — retornar 409 se duplicado)
- Não permite excluir o próprio usuário
- COORDINATION não pode mudar o próprio perfil para um perfil inferior (proteção contra auto-rebaixamento)
- Toda escrita gera AuditLog (via interceptor, ver 1.3.3)

#### 1.3.2 — Módulo Units

Em `apps/api/src/modules/units/`:

| Método | Rota | Quem pode |
|---|---|---|
| GET | `/units` | qualquer autenticado |
| GET | `/units/:id` | qualquer autenticado (UNIT só vê a própria) |
| POST | `/units` | COORDINATION |
| PATCH | `/units/:id` | COORDINATION |
| DELETE | `/units/:id` | COORDINATION (soft delete) |

**Regras:**
- Paginação igual a Users
- Filtros: `?type=`, `?active=`, `?search=`
- Não permite excluir unidade se tem usuários ativos vinculados → 409 com mensagem clara
- Soft delete preserva histórico

#### 1.3.3 — AuditInterceptor

Criar `apps/api/src/common/interceptors/audit.interceptor.ts`:

```typescript
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const isWrite = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);

    return next.handle().pipe(
      tap(async (response) => {
        if (isWrite && req.user) {
          await this.prisma.auditLog.create({
            data: {
              userId: req.user.sub,
              action: `${method} ${req.route.path}`,
              entity: extractEntity(req.route.path),
              entityId: response?.id ?? null,
              payload: { request: sanitize(req.body), response: sanitize(response) },
            },
          }).catch(err => console.error('AuditLog failed:', err)); // não bloquear resposta
        }
      }),
    );
  }
}

function sanitize(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = { ...obj };
  // remover campos sensíveis
  delete clone.password;
  delete clone.passwordHash;
  delete clone.currentPassword;
  delete clone.newPassword;
  delete clone.refreshToken;
  delete clone.accessToken;
  return clone;
}

function extractEntity(path: string): string {
  // /users/:id → "User"
  const segment = path.split('/').filter(Boolean)[2] || path;
  return segment.charAt(0).toUpperCase() + segment.slice(1, -1);
}
```

Aplicar globalmente em `app.module.ts`:
```typescript
providers: [
  {
    provide: APP_INTERCEPTOR,
    useClass: AuditInterceptor,
  },
],
```

#### 1.3.4 — Soft delete middleware Prisma

Em `apps/api/src/common/prisma/prisma.service.ts`, adicionar middleware:

```typescript
async onModuleInit() {
  // soft delete: filtra registros com deletedAt != null nas leituras
  this.$use(async (params, next) => {
    if (params.model && ['User', 'Unit'].includes(params.model)) {
      if (params.action === 'findUnique' || params.action === 'findFirst') {
        params.action = 'findFirst';
        params.args.where = { ...params.args.where, deletedAt: null };
      }
      if (params.action === 'findMany') {
        params.args = params.args ?? {};
        params.args.where = { ...params.args.where, deletedAt: null };
      }
      if (params.action === 'delete') {
        params.action = 'update';
        params.args.data = { deletedAt: new Date(), active: false };
      }
    }
    return next(params);
  });
  await this.$connect();
}
```

#### 1.3.5 — Validação da Fase 1.3

Testar via curl ou Insomnia/Postman:
- Listar usuários: `GET /users` (com Bearer)
- Filtrar: `GET /users?role=UNIT&active=true`
- Criar: `POST /units` com dados válidos
- Validar bloqueio: usuário ASSISTANT tentando criar unidade → 403
- Auditoria: após qualquer escrita, verificar tabela `AuditLog` no Prisma Studio

✅ **Checkpoint da Fase 1.3:** 11 endpoints (4 auth + 4 users + 3 units com filtros) funcionando com permissões corretas.

---

## Fase 1.4 — Tela de login + layout autenticado (frontend)

### Objetivo
Tela de login funcional. Após login, usuário vê layout com sidebar e header conforme mockup.

### Tarefas

#### 1.4.1 — Cliente API + interceptors

Atualizar `apps/web/src/lib/api-client.ts` (que já existe da Sprint 0):

```typescript
import axios, { AxiosError } from 'axios';
import { getAccessToken, setAccessToken, clearTokens } from './auth';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as any;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        refreshing ??= refreshAccessToken();
        const newToken = await refreshing;
        refreshing = null;
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return apiClient.request(original);
        }
      } catch {
        clearTokens();
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

async function refreshAccessToken(): Promise<string | null> {
  // implementar refresh
  return null;
}
```

Criar `apps/web/src/lib/auth.ts` para gerenciar tokens (em cookie httpOnly seria ideal, mas pra MVP usar localStorage com aviso de risco — Sprint 6 ajustamos):

```typescript
const ACCESS_KEY = 'farmagest_access';
const REFRESH_KEY = 'farmagest_refresh';

export function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
```

> ⚠️ `localStorage` é vulnerável a XSS. Para o MVP é aceitável. Na Sprint 6 (QA) migrar para cookies httpOnly.

#### 1.4.2 — Zustand store

`apps/web/src/stores/auth-store.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@farmagest/shared';

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    { name: 'farmagest-auth' },
  ),
);
```

#### 1.4.3 — TanStack Query Provider

Em `apps/web/src/app/providers.tsx` (novo):

```typescript
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }));
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster richColors position="top-right" />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

Envolver `apps/web/src/app/layout.tsx` com `<Providers>`.

#### 1.4.4 — Middleware de proteção

`apps/web/src/middleware.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // como armazenamos token em localStorage (cliente), middleware não
  // consegue checar. Proteção real fica em componentes via hook.
  // Apenas redirecionamos rotas públicas conhecidas.
  return NextResponse.next();
}
```

Criar `apps/web/src/components/auth/RequireAuth.tsx` para uso em layouts autenticados:

```typescript
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  if (!user) return null;
  return <>{children}</>;
}
```

#### 1.4.5 — Tela de login

Substituir o conteúdo atual de `apps/web/src/app/page.tsx` por uma página de boas-vindas que redireciona pra `/login` ou `/painel`. E criar `apps/web/src/app/(auth)/login/page.tsx` com a tela do mockup:

```typescript
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@farmagest/shared';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { setTokens } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth-store';
// imports do shadcn/ui Form, Input, Button, etc

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      const res = await apiClient.post('/auth/login', data);
      return res.data;
    },
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      router.push('/painel');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Erro ao fazer login');
    },
  });

  return (
    // visual idêntico ao mockup HTML, em React + Tailwind
    // tela cheia bg-pmdc-blue, card branco, logo, form
    // ...
  );
}
```

**Importante:** seguir o visual exato do mockup (`farmagest_mockup.html`), incluindo o selo "PREFEITURA MUNICIPAL DE DUQUE DE CAXIAS" no card.

#### 1.4.6 — Layout autenticado

`apps/web/src/app/(app)/layout.tsx`:

```typescript
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { RequireAuth } from '@/components/auth/RequireAuth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto bg-slate-100">
            {children}
          </main>
        </div>
      </div>
    </RequireAuth>
  );
}
```

Criar `Sidebar.tsx` e `Header.tsx` idênticos ao mockup. A sidebar deve renderizar **apenas os menus permitidos pro perfil do usuário** (Coordenação vê tudo, Unidade só vê Painel e o próprio cadastro).

#### 1.4.7 — Painel inicial placeholder

`apps/web/src/app/(app)/painel/page.tsx`:

```typescript
'use client';
import { useAuthStore } from '@/stores/auth-store';
import { USER_ROLE_LABELS } from '@farmagest/shared';

export default function PainelPage() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">
        Bem-vinda, {user?.name}!
      </h1>
      <p className="text-slate-500">
        Perfil: {user?.role && USER_ROLE_LABELS[user.role as any]}
      </p>
      <p className="text-slate-500 mt-4">
        Os indicadores de estoque aparecem aqui a partir da Sprint 3.
      </p>
    </div>
  );
}
```

#### 1.4.8 — Validação da Fase 1.4

- Acessar `http://localhost:3001/login`
- Fazer login com `marylyn@duquedecaxias.rj.gov.br` / `FarmaGest@2026`
- Redirecionar pra `/painel`
- Ver nome da Marylyn e sidebar com os menus
- F5 mantém a sessão (graças ao persist do Zustand)
- Logout volta pra `/login`

✅ **Checkpoint da Fase 1.4:** login funcional ponta a ponta com layout do mockup.

---

## Fase 1.5 — Telas de Usuários e Unidades

### Objetivo
CRUD visual completo de usuários e unidades, com filtros, paginação e formulários.

### Tarefas

#### 1.5.1 — Hooks de dados

Criar `apps/web/src/hooks/`:

- `use-users.ts` — useUsers, useUser, useCreateUser, useUpdateUser, useDeleteUser
- `use-units.ts` — useUnits, useUnit, useCreateUnit, useUpdateUnit, useDeleteUnit

Cada um usando TanStack Query, retornando dados tipados de `@farmagest/shared`.

#### 1.5.2 — Componentes compartilhados

Em `apps/web/src/components/shared/`:

- `DataTable.tsx` — tabela genérica com filtros e paginação (TanStack Table)
- `EmptyState.tsx` — tela vazia com CTA
- `ConfirmDialog.tsx` — modal de confirmação para ações destrutivas
- `PageHeader.tsx` — header com título, subtítulo e CTA opcional

#### 1.5.3 — Telas de Unidades

`apps/web/src/app/(app)/unidades/page.tsx` — listagem com filtros (tipo, busca)
`apps/web/src/app/(app)/unidades/novo/page.tsx` — formulário de criação
`apps/web/src/app/(app)/unidades/[id]/page.tsx` — detalhe + edição

Seguir visual do mockup (badges, tabelas, espaçamentos).

#### 1.5.4 — Telas de Usuários

Análogo a unidades:
- `apps/web/src/app/(app)/usuarios/page.tsx`
- `apps/web/src/app/(app)/usuarios/novo/page.tsx`
- `apps/web/src/app/(app)/usuarios/[id]/page.tsx`

Filtro por perfil (Select com `USER_ROLE_LABELS`), filtro por unidade.

#### 1.5.5 — Permissões na UI

Esconder botões de "Novo" e "Editar" para perfis que não podem. Não confiar só nisso — backend já protege. Mas evita confusão visual.

#### 1.5.6 — Validação da Fase 1.5

Como Marylyn:
- Lista todos os usuários e unidades
- Cria uma nova unidade fictícia
- Cria um usuário novo para essa unidade
- Edita um usuário (mudar telefone)
- Tenta excluir uma unidade com usuários → vê mensagem de erro
- Filtra usuários por perfil "Auxiliar"

✅ **Checkpoint da Fase 1.5:** Marylyn navega o sistema inteiro, faz CRUD completo.

---

## Encerramento da Sprint 1

### Checklist final

- [ ] Migrations aplicadas em dev local e em `dev` no Railway
- [ ] Seed roda em dev (NÃO em prod — proteger com `NODE_ENV`)
- [ ] Login funcional na URL `dev.farmagest.nodelab.com.br`
- [ ] Marylyn consegue logar com `marylyn@duquedecaxias.rj.gov.br` / `FarmaGest@2026`
- [ ] Listar/criar/editar/desativar usuários funciona
- [ ] Listar/criar/editar/desativar unidades funciona
- [ ] Sidebar mostra menus conforme perfil
- [ ] Auditoria registra todas as operações de escrita
- [ ] Endpoints retornam 403 quando perfil não permite
- [ ] Senha errada retorna 401 genérico (sem revelar se email existe)
- [ ] Refresh token funciona (testar deixando access expirar)
- [ ] Testes manuais passando em todos os fluxos

### Validação com a Marylyn

Quando estiver tudo deployado em `dev.farmagest.nodelab.com.br`:

1. Marcar uma reunião curta (~30 min) com a Marylyn
2. Pedir pra ela fazer login com a senha do seed
3. Mostrar a navegação geral, a sidebar
4. Ela cadastrar uma unidade fictícia e um usuário
5. Coletar feedback sobre nomenclatura, ordem dos campos, mensagens
6. Anotar ajustes — entrar como pequenos PRs entre Sprints 1 e 2

### Próximo passo

Sprint 2 → **Itens e Lotes**. A Marylyn precisa enviar a planilha de catálogo de medicamentos antes da Sprint 2 começar. Sem ela, a Sprint 2 fica bloqueada — então **avise ela com antecedência**.

---

## Riscos e cuidados desta sprint

1. **localStorage para tokens** é mitigação temporária. Na Sprint 6 (QA), migrar pra cookies httpOnly. Documentar isso como dívida técnica.

2. **Senha do seed em produção:** o seed cria a Marylyn com senha `FarmaGest@2026`. **Proteger o seed pra rodar apenas se `NODE_ENV !== 'production'`** ou exigir confirmação explícita. Em produção real, criar a Marylyn manualmente ou via fluxo de "primeiro acesso".

3. **CORS no Railway:** confirmar que `CORS_ORIGIN` do farmagest-api em dev aponta exatamente pra `https://dev.farmagest.nodelab.com.br`, sem trailing slash.

4. **`NEXT_PUBLIC_API_URL`:** sempre que mudar essa env no Railway, fazer redeploy do farmagest-web (Next.js embute em build time).

5. **Auditoria pode falhar silenciosamente:** se a tabela `AuditLog` ficar muito grande, queries lentas podem aparecer. Sprint 6 podemos adicionar índices ou particionamento.
