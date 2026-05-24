# Arquitetura Técnica

## Visão geral

Monorepo único contendo backend, frontend e pacote compartilhado de tipos, comunicando via API REST sobre HTTPS.

```
┌──────────────────────┐         ┌──────────────────────┐
│  apps/web            │ ──API── │  apps/api            │
│  (Next.js 15)        │  REST   │  (NestJS)            │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                │
           └─────── @farmagest/shared ──────┘
                    (tipos, enums,
                     schemas Zod)
                                            │
                                            ▼
                                  ┌──────────────────────┐
                                  │  PostgreSQL          │
                                  │  (Railway)           │
                                  └──────────────────────┘
```

## Estrutura do monorepo

```
farmagest/
├── apps/
│   ├── api/                            # backend NestJS
│   │   ├── src/
│   │   ├── prisma/
│   │   ├── package.json (name: @farmagest/api)
│   │   └── tsconfig.json
│   └── web/                            # frontend Next.js
│       ├── src/
│       ├── package.json (name: @farmagest/web)
│       └── tsconfig.json
├── packages/
│   └── shared/                         # tipos compartilhados
│       ├── src/
│       │   ├── enums/
│       │   ├── types/
│       │   ├── schemas/
│       │   └── constants/
│       └── package.json (name: @farmagest/shared)
├── package.json                        # root, scripts globais
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.base.json
└── .gitignore
```

## Por que monorepo?

- **Tipos compartilhados:** enums (`OrderStatus`, `MovementType`), DTOs e schemas Zod definidos UMA vez, usados nos dois lados. Sem duplicação, sem dessincronia.
- **Commits coerentes:** mudança que toca back e front vira um único PR.
- **Setup local simples:** `pnpm install` na raiz e tudo está pronto.
- **CI/CD por path:** Railway só faz redeploy do app que efetivamente mudou (via Watch Paths).

## Stack detalhada

### `packages/shared`

| Item | Tecnologia |
|---|---|
| Linguagem | TypeScript puro |
| Validação | Zod |
| Build | Sem build próprio (consumido como source) |

### `apps/api`

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | NestJS 10+ |
| Linguagem | TypeScript estrito |
| ORM | Prisma |
| Banco | PostgreSQL 15+ |
| Autenticação | JWT (passport-jwt) + bcrypt |
| Validação | Zod (via pipe customizado) |
| Testes | Jest (unit) + Supertest (e2e) |

### `apps/web`

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| Linguagem | TypeScript estrito |
| Estilização | Tailwind CSS |
| Componentes | shadcn/ui |
| Estado de dados | TanStack Query |
| Estado UI | Zustand |
| Formulários | React Hook Form + Zod (schemas do shared) |
| HTTP | Axios |
| Notificações | Sonner (toast) |
| Datas | date-fns |
| Ícones | lucide-react |

### Infraestrutura

| Item | Provedor |
|---|---|
| Hospedagem | Railway (1 projeto, 3 ambientes) |
| DNS | NodeLab |
| HTTPS | Railway (Let's Encrypt automático) |
| Monitoramento | Sentry (Sprint 6) |
| Logs | Railway logs nativos |
| Backup BD | Railway daily backups |

## Ambientes

| Ambiente | Web | API | Branch |
|---|---|---|---|
| Produção | `farmagest.nodelab.com.br` | `api.farmagest.nodelab.com.br` | `main` |
| Homologação | `hml.farmagest.nodelab.com.br` | `hml-api.farmagest.nodelab.com.br` | `hml` |
| Desenvolvimento | `dev.farmagest.nodelab.com.br` | `dev-api.farmagest.nodelab.com.br` | `dev` |

## Padrão de comunicação API

- Prefixo de rotas: `/api/v1/`
- Versionamento na URL (v1, v2...)
- Formato: JSON (request e response)
- Autenticação: `Authorization: Bearer <jwt>`
- Códigos HTTP semânticos (200/201/204/400/401/403/404/409/500)
- Erros padronizados (`ApiError` em `@farmagest/shared`): `{ statusCode, message, error, timestamp, path }`
- Paginação: query params `?page=1&limit=20` + response `Paginated<T>` com `{ data, meta: { total, page, lastPage, limit } }`

## Padrão de autenticação

1. `POST /auth/login` retorna `{ accessToken, refreshToken, user }`
2. Access token: JWT, vida 15min, payload `{ sub, email, role, unitId }`
3. Refresh token: JWT, vida 7 dias, armazenado em tabela `RefreshToken` (revogável)
4. `POST /auth/refresh` troca refresh por novo access
5. `POST /auth/logout` invalida o refresh atual

## Padrão de auditoria

Toda operação de escrita (POST/PATCH/PUT/DELETE) gera registro em `AuditLog`:
- `userId` — quem fez
- `action` — método + rota
- `entity` — qual entidade (Item, Lot, etc.)
- `entityId` — ID do registro
- `payload` — JSON com antes/depois
- `createdAt` — quando

## Padrão de soft delete

Não usar `DELETE` físico. Adicionar coluna `deletedAt: DateTime?`. Queries filtram por `deletedAt: null` por padrão (via middleware Prisma).

## CI/CD

Push em branch dispara deploy automático no Railway. Cada serviço usa **Watch Paths** para só fazer redeploy quando seu app específico mudar (ou `packages/shared`).

**Build commands (Railway):**

- `apps/api`:
  ```
  cd ../.. && pnpm install --frozen-lockfile && \
  pnpm --filter @farmagest/api build && \
  pnpm --filter @farmagest/api exec prisma generate
  ```
- `apps/web`:
  ```
  cd ../.. && pnpm install --frozen-lockfile && \
  pnpm --filter @farmagest/web build
  ```

**Start commands:**

- `apps/api`:
  ```
  cd ../.. && pnpm --filter @farmagest/api exec prisma migrate deploy && \
  pnpm --filter @farmagest/api start:prod
  ```
- `apps/web`:
  ```
  cd ../.. && pnpm --filter @farmagest/web start
  ```

## Segurança

- HTTPS obrigatório (gerenciado pelo Railway)
- Helmet no backend (headers de segurança)
- CORS restritivo (só permite o domínio do frontend correspondente)
- Senhas com bcrypt cost 10
- Rate limiting em endpoints sensíveis (login, refresh) — Sprint 6
- Variáveis sensíveis nunca em código (só env vars)
- `.env` no `.gitignore`

## Performance

- Queries Prisma com `select` explícito
- Paginação obrigatória em listagens
- Índices em FKs e colunas de filtro frequente
- Cache de queries no frontend via TanStack Query (`staleTime` configurado)

## LGPD

- Dados pessoais mínimos: nome e email dos usuários
- Não há dados de pacientes no MVP
- Senhas com hash
- HTTPS obrigatório
- Auditoria habilitada
- Soft delete preserva histórico para auditoria sem expor dados ativos
