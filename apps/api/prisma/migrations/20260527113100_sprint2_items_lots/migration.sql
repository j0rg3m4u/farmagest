-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('MEDICATION', 'CORRELATE');

-- AlterTable
ALTER TABLE "Sector" ADD COLUMN     "itemSequence" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ItemCategory" NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,
    "manufacturer" TEXT,
    "controlled344" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sectorId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "manufacturingDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "initialQuantity" DECIMAL(12,3) NOT NULL,
    "currentBalance" DECIMAL(12,3) NOT NULL,
    "supplier" TEXT,
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_code_key" ON "Item"("code");

-- CreateIndex
CREATE INDEX "Item_code_idx" ON "Item"("code");

-- CreateIndex
CREATE INDEX "Item_sectorId_idx" ON "Item"("sectorId");

-- CreateIndex
CREATE INDEX "Item_category_idx" ON "Item"("category");

-- CreateIndex
CREATE INDEX "Item_controlled344_idx" ON "Item"("controlled344");

-- CreateIndex
CREATE INDEX "Item_active_idx" ON "Item"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Item_sectorId_sequence_key" ON "Item"("sectorId", "sequence");

-- CreateIndex
CREATE INDEX "Lot_itemId_idx" ON "Lot"("itemId");

-- CreateIndex
CREATE INDEX "Lot_expirationDate_idx" ON "Lot"("expirationDate");

-- CreateIndex
CREATE INDEX "Lot_active_idx" ON "Lot"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Lot_itemId_lotNumber_key" ON "Lot"("itemId", "lotNumber");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
