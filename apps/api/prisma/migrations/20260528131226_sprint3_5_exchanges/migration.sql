-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('ENTRY', 'EXIT', 'ADJUSTMENT', 'EXIT_EXCHANGE', 'ENTRY_EXCHANGE');

-- CreateEnum
CREATE TYPE "ExchangeStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'READY', 'EXECUTED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "unitValue" DECIMAL(12,4);

-- AlterTable
ALTER TABLE "Lot" ADD COLUMN     "unitCost" DECIMAL(12,4);

-- CreateTable
CREATE TABLE "Movement" (
    "id" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitValue" DECIMAL(12,4),
    "sectorId" TEXT NOT NULL,
    "partnerExchangeId" TEXT,
    "createdById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalPartner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "responsibleName" TEXT NOT NULL,
    "contact" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ExternalPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exchange" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ExchangeStatus" NOT NULL DEFAULT 'DRAFT',
    "justification" TEXT NOT NULL,
    "tolerancePct" DECIMAL(5,2) NOT NULL,
    "partnerId" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Exchange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeOutput" (
    "id" TEXT NOT NULL,
    "exchangeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitValue" DECIMAL(12,4) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "movementId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeOutput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeInput" (
    "id" TEXT NOT NULL,
    "exchangeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotId" TEXT,
    "declaredLotNumber" TEXT,
    "declaredExpiration" TIMESTAMP(3),
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitValue" DECIMAL(12,4) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "movementId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeInput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "requireExchangeApproval" BOOLEAN NOT NULL DEFAULT false,
    "exchangeTolerancePct" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "exchangeApprovalThreshold" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "exchangeSequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Movement_itemId_idx" ON "Movement"("itemId");

-- CreateIndex
CREATE INDEX "Movement_lotId_idx" ON "Movement"("lotId");

-- CreateIndex
CREATE INDEX "Movement_sectorId_idx" ON "Movement"("sectorId");

-- CreateIndex
CREATE INDEX "Movement_type_idx" ON "Movement"("type");

-- CreateIndex
CREATE INDEX "Movement_createdAt_idx" ON "Movement"("createdAt");

-- CreateIndex
CREATE INDEX "Movement_partnerExchangeId_idx" ON "Movement"("partnerExchangeId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalPartner_name_key" ON "ExternalPartner"("name");

-- CreateIndex
CREATE INDEX "ExternalPartner_name_idx" ON "ExternalPartner"("name");

-- CreateIndex
CREATE INDEX "ExternalPartner_active_idx" ON "ExternalPartner"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Exchange_code_key" ON "Exchange"("code");

-- CreateIndex
CREATE INDEX "Exchange_code_idx" ON "Exchange"("code");

-- CreateIndex
CREATE INDEX "Exchange_status_idx" ON "Exchange"("status");

-- CreateIndex
CREATE INDEX "Exchange_partnerId_idx" ON "Exchange"("partnerId");

-- CreateIndex
CREATE INDEX "Exchange_sectorId_idx" ON "Exchange"("sectorId");

-- CreateIndex
CREATE INDEX "Exchange_date_idx" ON "Exchange"("date");

-- CreateIndex
CREATE INDEX "ExchangeOutput_exchangeId_idx" ON "ExchangeOutput"("exchangeId");

-- CreateIndex
CREATE INDEX "ExchangeOutput_itemId_idx" ON "ExchangeOutput"("itemId");

-- CreateIndex
CREATE INDEX "ExchangeOutput_lotId_idx" ON "ExchangeOutput"("lotId");

-- CreateIndex
CREATE INDEX "ExchangeOutput_executedAt_idx" ON "ExchangeOutput"("executedAt");

-- CreateIndex
CREATE INDEX "ExchangeInput_exchangeId_idx" ON "ExchangeInput"("exchangeId");

-- CreateIndex
CREATE INDEX "ExchangeInput_itemId_idx" ON "ExchangeInput"("itemId");

-- CreateIndex
CREATE INDEX "ExchangeInput_executedAt_idx" ON "ExchangeInput"("executedAt");

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "ExternalPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeOutput" ADD CONSTRAINT "ExchangeOutput_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeOutput" ADD CONSTRAINT "ExchangeOutput_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeOutput" ADD CONSTRAINT "ExchangeOutput_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeInput" ADD CONSTRAINT "ExchangeInput_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeInput" ADD CONSTRAINT "ExchangeInput_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeInput" ADD CONSTRAINT "ExchangeInput_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
