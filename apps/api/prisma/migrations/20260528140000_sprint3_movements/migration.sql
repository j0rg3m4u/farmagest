-- Substituir enum MovementType com os 8 tipos corretos da Sprint 3
-- (a tabela Movement existe mas está vazia neste ponto do desenvolvimento)

ALTER TYPE "MovementType" RENAME TO "MovementType_old";

CREATE TYPE "MovementType" AS ENUM (
  'ENTRY_PURCHASE',
  'ENTRY_EXCHANGE',
  'ENTRY_ADJUSTMENT',
  'ENTRY_RETURN',
  'EXIT_SUPPLY',
  'EXIT_EXCHANGE',
  'EXIT_ADJUSTMENT',
  'EXIT_DISPOSAL'
);

ALTER TABLE "Movement"
  ALTER COLUMN "type" TYPE "MovementType"
  USING "type"::text::"MovementType";

DROP TYPE "MovementType_old";

-- Remover coluna notes (não faz parte do modelo correto)
ALTER TABLE "Movement" DROP COLUMN IF EXISTS "notes";

-- Adicionar colunas da Sprint 3
ALTER TABLE "Movement" ADD COLUMN "balanceAfter" DECIMAL(12,3) NOT NULL DEFAULT 0;
ALTER TABLE "Movement" ADD COLUMN "unitId" TEXT;
ALTER TABLE "Movement" ADD COLUMN "invoiceNumber" TEXT;
ALTER TABLE "Movement" ADD COLUMN "reason" TEXT;
ALTER TABLE "Movement" ADD COLUMN "reversalOfId" TEXT;

-- Foreign keys novas
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Movement" ADD CONSTRAINT "Movement_reversalOfId_fkey"
  FOREIGN KEY ("reversalOfId") REFERENCES "Movement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Índices novos
CREATE INDEX "Movement_unitId_idx" ON "Movement"("unitId");
CREATE INDEX "Movement_createdById_idx" ON "Movement"("createdById");
