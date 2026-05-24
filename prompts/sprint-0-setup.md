# Sprint 0 — Setup do monorepo FarmaGest

## Objetivo

Ter o monorepo FarmaGest funcionando, com:
- Estrutura `apps/api` (backend NestJS) + `apps/web` (frontend Next.js) + `packages/shared` (tipos compartilhados)
- pnpm workspaces orquestrando tudo
- Deploy automatizado no Railway nos 3 ambientes (dev, hml, prod)
- Subdomínios funcionando com HTTPS
- Tela "Hello FarmaGest" no ar, conectando ao healthcheck da API

Sem features de negócio ainda — apenas fundação técnica sólida.

## Pré-requisitos

Antes de começar, garanta:

- [ ] Conta no GitHub com permissão para criar repositórios
- [ ] Conta no Railway (plano Hobby ou superior)
- [ ] Acesso ao painel DNS de `nodelab.com.br`
- [ ] Node.js 20 LTS ou superior instalado
- [ ] pnpm instalado globalmente (`npm install -g pnpm` ou via Corepack)
- [ ] Git configurado localmente
- [ ] GitHub CLI (`gh`) instalado e autenticado (opcional, facilita)

---

## Tarefa 1 — Inicializar o monorepo

### 1.1 Criar diretório raiz

```bash
mkdir -p ~/projetos/farmagest
cd ~/projetos/farmagest
git init
```

### 1.2 `package.json` raiz

```json
{
  "name": "farmagest",
  "version": "0.0.0",
  "private": true,
  "description": "Sistema de controle de medicamentos e correlatos — Prefeitura Municipal de Duque de Caxias",
  "scripts": {
    "dev:api": "pnpm --filter @farmagest/api dev",
    "dev:web": "pnpm --filter @farmagest/web dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck"
  },
  "packageManager": "pnpm@9.0.0",
  "engines": {
    "node": ">=20"
  }
}
```

### 1.3 `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### 1.4 `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@farmagest/shared": ["packages/shared/src"],
      "@farmagest/shared/*": ["packages/shared/src/*"]
    }
  }
}
```

### 1.5 `.gitignore` raiz

```
# dependencies
node_modules/
.pnpm-store/

# build
dist/
.next/
build/
out/

# env
.env
.env.local
.env.*.local
!.env.example

# logs
*.log
npm-debug.log*
yarn-debug.log*

# editor
.vscode/
.idea/
*.swp

# os
.DS_Store
Thumbs.db

# misc
coverage/
.turbo/
```

### 1.6 `.editorconfig`

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

### 1.7 Criar estrutura de pastas

```bash
mkdir -p apps/api apps/web packages/shared
```

---

## Tarefa 2 — Criar `packages/shared`

### 2.1 Inicializar

```bash
cd packages/shared
mkdir -p src/enums src/types src/schemas src/constants
```

### 2.2 `package.json`

```json
{
  "name": "@farmagest/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

### 2.3 `tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

### 2.4 Arquivos iniciais

`src/enums/user-role.ts`:

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

`src/enums/index.ts`:

```typescript
export * from './user-role';
```

`src/types/api.ts`:

```typescript
export interface Paginated<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
    limit: number;
  };
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
}
```

`src/types/index.ts`:

```typescript
export * from './api';
```

`src/constants/business.ts`:

```typescript
export const CRITICAL_STOCK_DAYS = 7;
export const EXPIRATION_WARNING_DAYS = [30, 60, 90] as const;
export const MAX_ITEMS_PER_ORDER = 200;
export const MAX_LOT_NUMBER_LENGTH = 50;
export const DEFAULT_PAGE_SIZE = 20;
```

`src/constants/index.ts`:

```typescript
export * from './business';
```

`src/index.ts`:

```typescript
export * from './enums';
export * from './types';
export * from './constants';
// schemas/ ainda vazio - serão adicionados nas sprints seguintes
```

---

## Tarefa 3 — Criar `apps/api` (backend NestJS)

### 3.1 Inicializar Nest

```bash
cd ../../apps/api
pnpm dlx @nestjs/cli new . --package-manager=pnpm --strict
```

Quando perguntar sobre git, escolha **No** (já temos no root).

### 3.2 Ajustar `package.json`

Renomear para `@farmagest/api`:

```json
{
  "name": "@farmagest/api",
  ...
}
```

E adicionar `@farmagest/shared` como dependência workspace:

```json
{
  "dependencies": {
    "@farmagest/shared": "workspace:*",
    ...
  }
}
```

### 3.3 Dependências adicionais

```bash
cd ../..
pnpm --filter @farmagest/api add @nestjs/config @nestjs/jwt @nestjs/passport \
  @prisma/client bcrypt helmet passport passport-jwt passport-local zod

pnpm --filter @farmagest/api add -D prisma @types/bcrypt @types/passport-jwt \
  @types/passport-local
```

### 3.4 Configurar Prisma

```bash
cd apps/api
pnpm exec prisma init --datasource-provider postgresql
cd ../..
```

`apps/api/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Models reais virão na Sprint 1. Este é apenas para garantir migrations rodando.
model AppMeta {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt
}
```

### 3.5 Estrutura inicial — módulo health

`apps/api/src/common/prisma/prisma.service.ts`:

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

`apps/api/src/common/prisma/prisma.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

`apps/api/src/modules/health/health.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@farmagest/shared';

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    };
  }
}
```

`apps/api/src/modules/health/health.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({ controllers: [HealthController] })
export class HealthModule {}
```

`apps/api/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}
```

`apps/api/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? [],
    credentials: true,
  });
  app.setGlobalPrefix('api/v1');

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`FarmaGest API rodando em http://localhost:${port}/api/v1`);
}

bootstrap();
```

### 3.6 Ajustar `tsconfig.json` do api

`apps/api/tsconfig.json` deve estender o base e adicionar paths:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "target": "ES2022",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "outDir": "./dist",
    "incremental": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### 3.7 `.env.example`

```
DATABASE_URL="postgresql://user:pass@localhost:5432/farmagest_dev"
JWT_SECRET="change-me-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="change-me-too"
JWT_REFRESH_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:3001"
NODE_ENV="development"
PORT="3000"
```

### 3.8 `railway.toml` na raiz do monorepo

(Vamos criar um arquivo por serviço dentro de `.railway/`, ou usar Service Settings no UI — recomendo configurar via UI por enquanto.)

Aqui é importante: como é um monorepo, **NÃO criamos `railway.toml` em cada app**. A configuração é feita no painel do Railway, indicando:
- Root Directory: `apps/api`
- Build Command: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @farmagest/api build && pnpm --filter @farmagest/api exec prisma generate`
- Start Command: `cd ../.. && pnpm --filter @farmagest/api exec prisma migrate deploy && pnpm --filter @farmagest/api start:prod`
- Healthcheck Path: `/api/v1/health`

Detalhes na Tarefa 6.

---

## Tarefa 4 — Criar `apps/web` (frontend Next.js)

### 4.1 Inicializar Next

```bash
cd apps/web
pnpm dlx create-next-app@latest . --typescript --tailwind --app --src-dir \
  --import-alias "@/*" --use-pnpm --eslint --turbopack
```

Confirme: TypeScript Yes, Tailwind Yes, App Router Yes, src/ Yes, import alias @/* Yes.

### 4.2 Ajustar `package.json`

Renomear para `@farmagest/web`:

```json
{
  "name": "@farmagest/web",
  ...
}
```

Adicionar dependência workspace:

```json
{
  "dependencies": {
    "@farmagest/shared": "workspace:*",
    ...
  }
}
```

### 4.3 Dependências adicionais

```bash
cd ../..
pnpm --filter @farmagest/web add @tanstack/react-query @tanstack/react-query-devtools \
  axios zustand react-hook-form @hookform/resolvers zod \
  date-fns lucide-react sonner clsx tailwind-merge class-variance-authority
```

### 4.4 Configurar shadcn/ui

```bash
cd apps/web
pnpm dlx shadcn@latest init
```

Escolha:
- TypeScript: Yes
- Style: Default
- Base color: Slate
- CSS variables: Yes

```bash
pnpm dlx shadcn@latest add button input label form card table dialog \
  badge dropdown-menu select sonner separator avatar
cd ../..
```

### 4.5 Aplicar tema PMDC

`apps/web/tailwind.config.ts` — adicionar a paleta dentro de `theme.extend.colors`:

```typescript
colors: {
  pmdc: {
    blue: {
      DEFAULT: '#1F3864',
      dark: '#152A4F',
      light: '#2C4F8C',
      soft: '#E6EBF4',
    },
    gold: {
      DEFAULT: '#FAC775',
    },
  },
  status: {
    danger: { DEFAULT: '#A32D2D', bg: '#FCEBEB' },
    warning: { DEFAULT: '#854F0B', bg: '#FAEEDA' },
    success: { DEFAULT: '#3B6D11', bg: '#EAF3DE' },
    info: { DEFAULT: '#185FA5', bg: '#E6F1FB' },
  },
  // ... preservar o restante das cores do shadcn
}
```

Em `apps/web/src/app/globals.css`, ajustar `--primary` para usar `#1F3864`.

Em `apps/web/src/app/layout.tsx`, importar Inter:

```typescript
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
```

E aplicar `${inter.variable}` na tag `<body>`.

### 4.6 Ajustar `next.config.ts` para transpilar shared

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@farmagest/shared'],
};

export default nextConfig;
```

### 4.7 `lib/api-client.ts`

```typescript
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
});
```

### 4.8 Página inicial conectando ao health

`apps/web/src/app/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { HealthResponse } from '@farmagest/shared';

export default function HomePage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<HealthResponse>('/health')
      .then((r) => setHealth(r.data))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <main className="min-h-screen bg-pmdc-blue flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
        <div className="w-16 h-16 bg-pmdc-blue rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl">
          💊
        </div>
        <h1 className="text-3xl font-semibold text-slate-900 mb-1">FarmaGest</h1>
        <p className="text-sm text-slate-500 mb-2">
          Controle de medicamentos e correlatos
        </p>
        <p className="text-xs text-slate-400 tracking-wider mb-8">
          PREFEITURA MUNICIPAL DE DUQUE DE CAXIAS
        </p>

        <div className="border-t pt-6">
          {error && (
            <div className="bg-status-danger-bg text-status-danger p-3 rounded-lg text-sm">
              ❌ Erro ao conectar à API: {error}
            </div>
          )}
          {health && (
            <div className="bg-status-success-bg text-status-success p-3 rounded-lg text-sm">
              ✓ API conectada — v{health.version}
              <div className="text-xs text-slate-500 mt-1">
                {new Date(health.timestamp).toLocaleString('pt-BR')}
              </div>
            </div>
          )}
          {!health && !error && (
            <div className="text-slate-400 text-sm">Verificando API...</div>
          )}
        </div>
      </div>
    </main>
  );
}
```

### 4.9 `.env.example`

```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_APP_NAME=FarmaGest
NEXT_PUBLIC_PMDC_NAME=PREFEITURA MUNICIPAL DE DUQUE DE CAXIAS
```

---

## Tarefa 5 — Validação local

### 5.1 Instalar tudo

```bash
cd ~/projetos/farmagest
pnpm install
```

### 5.2 Subir PostgreSQL local

Use Docker (recomendado):

```bash
docker run -d --name farmagest-postgres \
  -e POSTGRES_USER=farmagest \
  -e POSTGRES_PASSWORD=farmagest \
  -e POSTGRES_DB=farmagest_dev \
  -p 5432:5432 \
  postgres:15
```

### 5.3 Configurar `.env` do api

Copiar `.env.example` para `.env` em `apps/api/` e ajustar:

```
DATABASE_URL="postgresql://farmagest:farmagest@localhost:5432/farmagest_dev"
JWT_SECRET="dev-secret-32-chars-minimum-please"
JWT_REFRESH_SECRET="dev-refresh-secret-32-chars-min-pls"
CORS_ORIGIN="http://localhost:3001"
```

### 5.4 Rodar migration

```bash
pnpm --filter @farmagest/api exec prisma migrate dev --name init
```

### 5.5 Subir backend

```bash
pnpm dev:api
```

Deve mostrar: `FarmaGest API rodando em http://localhost:3000/api/v1`

Em outro terminal, testar:

```bash
curl http://localhost:3000/api/v1/health
```

Deve retornar JSON com status ok.

### 5.6 Configurar `.env.local` do web

`apps/web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

### 5.7 Subir frontend

```bash
pnpm dev:web
```

Configure pra rodar na porta 3001 (em `apps/web/package.json`, ajustar script `dev` para `next dev --turbopack -p 3001`).

Abra `http://localhost:3001` no navegador. Deve mostrar a tela "Hello FarmaGest" com card verde "API conectada".

---

## Tarefa 6 — Criar repositório no GitHub

### 6.1 Primeiro commit

```bash
cd ~/projetos/farmagest
git add .
git commit -m "chore: setup monorepo with pnpm workspaces — sprint 0"
git branch -M main
```

### 6.2 Criar no GitHub

```bash
gh repo create farmagest --private --source=. --remote=origin --push
```

(ou crie pelo site e ajuste o remote)

### 6.3 Criar branches `dev` e `hml`

```bash
git checkout -b dev && git push -u origin dev
git checkout -b hml && git push -u origin hml
git checkout main
```

---

## Tarefa 7 — Configurar Railway

### 7.1 Criar projeto

Em [railway.app](https://railway.app), criar um único projeto chamado `farmagest`.

### 7.2 Criar 3 ambientes

Usar a feature "Environments" do Railway. Criar:
- `production` (default)
- `staging`
- `development`

### 7.3 Provisionar PostgreSQL em cada ambiente

Em cada ambiente, "Add Service" → "Database" → "PostgreSQL". Railway gera `DATABASE_URL` automaticamente.

### 7.4 Adicionar serviços (4 por ambiente: api + web)

Para cada ambiente:

**Serviço farmagest-api:**
- "Deploy from GitHub Repo" → `farmagest`
- Branch: `main` (prod), `hml` (staging), `dev` (development)
- **Settings → Root Directory:** `apps/api`
- **Settings → Build Command:** `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @farmagest/api build && pnpm --filter @farmagest/api exec prisma generate`
- **Settings → Start Command:** `cd ../.. && pnpm --filter @farmagest/api exec prisma migrate deploy && pnpm --filter @farmagest/api start:prod`
- **Settings → Healthcheck Path:** `/api/v1/health`
- **Settings → Watch Paths:** `apps/api/**`, `packages/shared/**`

**Serviço farmagest-web:**
- Mesmo repo, mesma branch
- **Settings → Root Directory:** `apps/web`
- **Settings → Build Command:** `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @farmagest/web build`
- **Settings → Start Command:** `cd ../.. && pnpm --filter @farmagest/web start`
- **Settings → Watch Paths:** `apps/web/**`, `packages/shared/**`

> O **Watch Paths** é importante no monorepo: garante que só dispara redeploy quando o app específico (ou o shared) mudar.

### 7.5 Variáveis de ambiente

**farmagest-api (cada ambiente):**
- `DATABASE_URL` (referenciar serviço Postgres do mesmo ambiente: `${{Postgres.DATABASE_URL}}`)
- `JWT_SECRET` (gerar: `openssl rand -hex 64`)
- `JWT_REFRESH_SECRET` (idem)
- `CORS_ORIGIN` (URL pública do farmagest-web do mesmo ambiente)
- `NODE_ENV` (`production` / `staging` / `development`)
- `PORT` = `3000`

**farmagest-web (cada ambiente):**
- `NEXT_PUBLIC_API_URL` (URL pública do farmagest-api + `/api/v1`)
- `NEXT_PUBLIC_APP_NAME` = `FarmaGest`
- `NEXT_PUBLIC_PMDC_NAME` = `PREFEITURA MUNICIPAL DE DUQUE DE CAXIAS`

---

## Tarefa 8 — Configurar domínios

### 8.1 No Railway

Em cada serviço, "Settings → Networking → Custom Domain":

| Serviço | Ambiente | Domínio |
|---|---|---|
| api | production | `api.farmagest.nodelab.com.br` |
| api | staging | `hml-api.farmagest.nodelab.com.br` |
| api | development | `dev-api.farmagest.nodelab.com.br` |
| web | production | `farmagest.nodelab.com.br` |
| web | staging | `hml.farmagest.nodelab.com.br` |
| web | development | `dev.farmagest.nodelab.com.br` |

O Railway mostra um CNAME a adicionar.

### 8.2 No DNS da NodeLab

Adicionar os 6 registros CNAME apontando para o destino que o Railway indicou. Aguardar propagação (5-15 minutos).

---

## Tarefa 9 — Validação final em produção

```bash
curl https://dev-api.farmagest.nodelab.com.br/api/v1/health
curl https://hml-api.farmagest.nodelab.com.br/api/v1/health
curl https://api.farmagest.nodelab.com.br/api/v1/health
```

Cada um deve retornar 200 OK com JSON.

Abra cada front:
- `https://dev.farmagest.nodelab.com.br`
- `https://hml.farmagest.nodelab.com.br`
- `https://farmagest.nodelab.com.br`

Todos devem mostrar a tela "Hello FarmaGest" com card verde.

---

## Checklist final da Sprint 0

- [ ] Monorepo `farmagest` criado, com `pnpm-workspace.yaml` configurado
- [ ] `packages/shared` com tipos iniciais (UserRole, Paginated, HealthResponse, constants)
- [ ] `apps/api` com NestJS + Prisma + módulo health
- [ ] `apps/web` com Next.js + Tailwind + shadcn/ui + tema PMDC
- [ ] Tema visual de Duque de Caxias aplicado
- [ ] Healthcheck `/api/v1/health` respondendo
- [ ] Tela inicial do frontend conectando ao healthcheck
- [ ] Repositório `farmagest` no GitHub, com branches `main`/`hml`/`dev`
- [ ] Projeto Railway com 3 ambientes (production/staging/development)
- [ ] PostgreSQL provisionado em cada ambiente
- [ ] 4 serviços rodando em cada ambiente (api + web, cada um com seu Postgres)
- [ ] 6 subdomínios funcionando com HTTPS
- [ ] CI/CD: push em branch dispara deploy automático
- [ ] `.env.example` em api e web
- [ ] Variáveis de ambiente do Railway configuradas em todos os ambientes
- [ ] Lint e formatação configurados

---

## Próximo passo

Sprint 0 concluída → me avise no chat que eu gero o prompt da **Sprint 1** (autenticação + cadastro de usuários + cadastro de unidades).

## Troubleshooting

- **`Cannot find module '@farmagest/shared'`:** confirmar que `pnpm install` foi rodado na raiz; conferir paths no `tsconfig.base.json` e `transpilePackages` no `next.config.ts`.
- **Erro de CORS:** verificar `CORS_ORIGIN` no api apontando para URL do web do mesmo ambiente.
- **Build do Railway falha por `prisma generate`:** garantir que está no build command, antes do `build`.
- **Subdomínio não funciona:** propagação DNS pode levar até 1h; confirmar CNAME exato fornecido pelo Railway.
- **Postgres não conecta no Railway:** confirmar que `DATABASE_URL` é a referência do serviço Postgres `${{Postgres.DATABASE_URL}}`, não um valor estático.
