# Modelo de Dados

## Visão geral das entidades

```
User ─── (N) ── Order ── (N) ── OrderItem ── (1) ── Item
                                    │                  │
                                    │              (1..N)
                                    │                  │
                                    └─── (0..1) ──── Lot
                                                       │
                                                  (N) Movement
                                                       │
                                               (N) ── User (createdBy)

Unit ─── (N) ── Order
Unit ─── (N) ── User (perfil UNIT)

AuditLog ── (N) ── User
```

## Schema Prisma (versão preliminar)

Schema **completo planejado para o MVP** (vive em `apps/api/prisma/schema.prisma`). Será introduzido por sprints:
- Sprint 1: `User`, `Unit`, `RefreshToken`, `AuditLog`
- Sprint 2: `Item`, `Lot` (estrutura, sem movimento ainda)
- Sprint 3: `Movement`
- Sprint 4: `Order`, `OrderItem`

```prisma
// ============================
// USER & AUTH
// ============================

enum UserRole {
  COORDINATION
  ADMIN
  ASSISTANT
  UNIT
  MANAGER         // Fase 2
}

model User {
  id              String        @id @default(cuid())
  name            String
  email           String        @unique
  passwordHash    String
  role            UserRole
  unitId          String?
  unit            Unit?         @relation(fields: [unitId], references: [id])
  active          Boolean       @default(true)
  lastLoginAt     DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  deletedAt       DateTime?

  refreshTokens   RefreshToken[]
  auditLogs       AuditLog[]
  ordersCreated   Order[]       @relation("OrderCreatedBy")
  movementsCreated Movement[]   @relation("MovementCreatedBy")

  @@index([email])
  @@index([unitId])
}

model RefreshToken {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  token       String   @unique
  expiresAt   DateTime
  revokedAt   DateTime?
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([token])
}

// ============================
// UNIT
// ============================

enum UnitType {
  UBS
  UPA
  HOSPITAL
  CAPS
  OTHER
}

model Unit {
  id           String   @id @default(cuid())
  name         String
  type         UnitType
  address      String?
  responsible  String
  contact      String?
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  deletedAt    DateTime?

  users        User[]
  orders       Order[]

  @@index([name])
}

// ============================
// ITEM & LOT
// ============================

enum ItemCategory {
  MEDICATION
  CORRELATE
}

model Item {
  id              String        @id @default(cuid())
  code            String        @unique
  description     String
  category        ItemCategory
  unitOfMeasure   String
  manufacturer    String?
  controlled344   Boolean       @default(false)
  active          Boolean       @default(true)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  deletedAt       DateTime?

  lots            Lot[]
  orderItems      OrderItem[]

  @@index([code])
  @@index([category])
  @@index([controlled344])
}

model Lot {
  id                  String   @id @default(cuid())
  itemId              String
  item                Item     @relation(fields: [itemId], references: [id])
  lotNumber           String
  manufacturingDate   DateTime?
  expirationDate      DateTime
  initialQuantity     Decimal  @db.Decimal(12, 3)
  currentBalance      Decimal  @db.Decimal(12, 3)
  supplier            String?
  invoiceNumber       String?
  active              Boolean  @default(true)
  createdAt           DateTime @default(now())

  movements           Movement[]
  orderItems          OrderItem[]

  @@unique([itemId, lotNumber])
  @@index([expirationDate])
  @@index([itemId])
}

// ============================
// MOVEMENT
// ============================

enum MovementType {
  ENTRY
  EXIT
  ADJUSTMENT
}

model Movement {
  id            String       @id @default(cuid())
  type          MovementType
  lotId         String
  lot           Lot          @relation(fields: [lotId], references: [id])
  quantity      Decimal      @db.Decimal(12, 3)
  unitId        String?
  unit          Unit?        @relation(fields: [unitId], references: [id], onDelete: NoAction, map: "movement_unit_fk")
  orderId       String?
  order         Order?       @relation(fields: [orderId], references: [id])
  reason        String?
  createdById   String
  createdBy     User         @relation("MovementCreatedBy", fields: [createdById], references: [id])
  createdAt     DateTime     @default(now())

  @@index([type])
  @@index([lotId])
  @@index([unitId])
  @@index([orderId])
  @@index([createdAt])
}

// ============================
// ORDER
// ============================

enum OrderStatus {
  DRAFT
  TRIAGE
  SEPARATION
  FULFILLED
  CANCELLED
}

model Order {
  id              String        @id @default(cuid())
  unitId          String
  unit            Unit          @relation(fields: [unitId], references: [id])
  status          OrderStatus   @default(DRAFT)
  createdById     String
  createdBy       User          @relation("OrderCreatedBy", fields: [createdById], references: [id])
  notes           String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  fulfilledAt     DateTime?
  cancelledAt     DateTime?

  items           OrderItem[]
  movements       Movement[]

  @@index([unitId])
  @@index([status])
}

model OrderItem {
  id                    String   @id @default(cuid())
  orderId               String
  order                 Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  itemId                String
  item                  Item     @relation(fields: [itemId], references: [id])
  requestedQuantity     Decimal  @db.Decimal(12, 3)
  triagedQuantity       Decimal? @db.Decimal(12, 3)
  fulfilledQuantity     Decimal? @db.Decimal(12, 3)
  lotId                 String?
  lot                   Lot?     @relation(fields: [lotId], references: [id])
  observation           String?

  @@index([orderId])
  @@index([itemId])
}

// ============================
// AUDIT LOG
// ============================

model AuditLog {
  id          String   @id @default(cuid())
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  action      String
  entity      String
  entityId    String?
  payload     Json
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([entity, entityId])
  @@index([createdAt])
}
```

## Tipos no `@farmagest/shared`

Os enums acima são duplicados (de propósito) em `packages/shared/src/enums/`, com as labels em pt-BR:

```typescript
// packages/shared/src/enums/order-status.ts
export enum OrderStatus {
  DRAFT = 'DRAFT',
  TRIAGE = 'TRIAGE',
  SEPARATION = 'SEPARATION',
  FULFILLED = 'FULFILLED',
  CANCELLED = 'CANCELLED',
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.DRAFT]: 'Rascunho',
  [OrderStatus.TRIAGE]: 'Em triagem',
  [OrderStatus.SEPARATION]: 'Em separação',
  [OrderStatus.FULFILLED]: 'Atendido',
  [OrderStatus.CANCELLED]: 'Cancelado',
};
```

**Por que duplicar?** Os enums do Prisma são gerados automaticamente a partir do schema, mas só ficam disponíveis dentro do `apps/api`. Para o frontend usar os mesmos valores, definimos em `@farmagest/shared` (que é a fonte da verdade para o front). Os valores devem ser idênticos — manter sincronizado é responsabilidade ao alterar.

Tipos completos das entidades (sem campos sensíveis como `passwordHash`) também ficam no shared:

```typescript
// packages/shared/src/types/user.ts
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

## Decisões de modelagem

### Por que `Decimal(12,3)` para quantidades?

Algumas unidades (mL, mg) podem ter decimais. 12 dígitos no total (9 inteiros + 3 decimais) cobre estoques realistas.

### Por que `cuid()` em vez de `uuid()`?

Mais curto e ordenável por criação (URL-friendly).

### Por que `currentBalance` em `Lot`?

Performance. Mas o backend deve atualizar `currentBalance` SEMPRE dentro de uma transação Prisma junto com a criação da `Movement`. Nunca em separado.

### Por que `quantity` sempre positiva?

O sinal vem do `type` (`ENTRY` = +, `EXIT` = −, `ADJUSTMENT` = ambos via campo separado). Simplifica validação.

### Por que `Movement.unitId` é opcional?

Entradas (compra) não têm unidade — vão direto pro estoque central. Saídas têm unidade obrigatória.

## Regras de integridade

1. **Saldo:** `Lot.currentBalance = Lot.initialQuantity - SUM(EXIT) + SUM(ENTRY*ajustes)`. Sempre calculável via movimentações.

2. **FEFO:** ao criar `Movement` de saída sem `lotId` específico, selecionar lote com `expirationDate` mais próxima e `currentBalance > 0`.

3. **Transições de Order:** validar no service (não permitir DRAFT → FULFILLED diretamente).

4. **Cancelamento de Order:** se pedido tem movimentações já registradas, criar movimentações reversas (não excluir as originais).

5. **Soft delete em cascata:** ao desativar uma Unit, não excluir; bloquear novos pedidos mas preservar histórico.

## Seeds essenciais

Sprint 1:
- 1 usuário admin: `marylyn@duquedecaxias.rj.gov.br` (perfil COORDINATION)
- 2-3 unidades de exemplo

Sprint 2:
- Importação inicial via upload de planilha (não seed fixo)

Sprint 3+:
- Apenas dados de teste em ambiente dev
