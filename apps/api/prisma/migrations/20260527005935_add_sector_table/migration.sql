-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "sectorId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sectorId" TEXT;

-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "responsible" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sector_name_key" ON "Sector"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_code_key" ON "Sector"("code");

-- CreateIndex
CREATE INDEX "Sector_name_idx" ON "Sector"("name");

-- CreateIndex
CREATE INDEX "Sector_active_idx" ON "Sector"("active");

-- CreateIndex
CREATE INDEX "AuditLog_sectorId_idx" ON "AuditLog"("sectorId");

-- CreateIndex
CREATE INDEX "User_sectorId_idx" ON "User"("sectorId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
