-- CreateEnum
CREATE TYPE "GeraStatus" AS ENUM ('RECEIVED', 'TRIAGING', 'COMPLETED', 'DISPATCHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GeraItemStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "GeraType" AS ENUM ('MONTHLY', 'EXTRAORDINARY', 'URGENT');

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "geraSequence" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Gera" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "externalNumber" TEXT,
    "status" "GeraStatus" NOT NULL DEFAULT 'RECEIVED',
    "type" "GeraType" NOT NULL DEFAULT 'MONTHLY',
    "unitId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL,
    "expectedDelivery" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "importedFrom" TEXT,
    "importedFileUrl" TEXT,
    "registeredById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Gera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeraItem" (
    "id" TEXT NOT NULL,
    "geraId" TEXT NOT NULL,
    "externalCode" TEXT,
    "description" TEXT NOT NULL,
    "itemId" TEXT,
    "sectorId" TEXT,
    "declaredBalance" DECIMAL(12,3),
    "consumption" DECIMAL(12,3),
    "requested" DECIMAL(12,3) NOT NULL,
    "status" "GeraItemStatus" NOT NULL DEFAULT 'PENDING',
    "approved" DECIMAL(12,3),
    "denialReason" TEXT,
    "triagedById" TEXT,
    "triagedAt" TIMESTAMP(3),
    "movementId" TEXT,
    "lotId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeraItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalCodeMapping" (
    "id" TEXT NOT NULL,
    "externalCode" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalCodeMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Gera_code_key" ON "Gera"("code");

-- CreateIndex
CREATE INDEX "Gera_unitId_idx" ON "Gera"("unitId");

-- CreateIndex
CREATE INDEX "Gera_status_idx" ON "Gera"("status");

-- CreateIndex
CREATE INDEX "Gera_requestedAt_idx" ON "Gera"("requestedAt");

-- CreateIndex
CREATE INDEX "Gera_externalNumber_idx" ON "Gera"("externalNumber");

-- CreateIndex
CREATE INDEX "GeraItem_geraId_idx" ON "GeraItem"("geraId");

-- CreateIndex
CREATE INDEX "GeraItem_itemId_idx" ON "GeraItem"("itemId");

-- CreateIndex
CREATE INDEX "GeraItem_sectorId_idx" ON "GeraItem"("sectorId");

-- CreateIndex
CREATE INDEX "GeraItem_status_idx" ON "GeraItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalCodeMapping_externalCode_key" ON "ExternalCodeMapping"("externalCode");

-- CreateIndex
CREATE INDEX "ExternalCodeMapping_itemId_idx" ON "ExternalCodeMapping"("itemId");

-- AddForeignKey
ALTER TABLE "Gera" ADD CONSTRAINT "Gera_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gera" ADD CONSTRAINT "Gera_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeraItem" ADD CONSTRAINT "GeraItem_geraId_fkey" FOREIGN KEY ("geraId") REFERENCES "Gera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeraItem" ADD CONSTRAINT "GeraItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeraItem" ADD CONSTRAINT "GeraItem_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeraItem" ADD CONSTRAINT "GeraItem_triagedById_fkey" FOREIGN KEY ("triagedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeraItem" ADD CONSTRAINT "GeraItem_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "Movement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeraItem" ADD CONSTRAINT "GeraItem_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCodeMapping" ADD CONSTRAINT "ExternalCodeMapping_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
