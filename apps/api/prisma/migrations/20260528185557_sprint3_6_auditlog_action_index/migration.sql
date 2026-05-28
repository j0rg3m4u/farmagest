-- AlterTable
ALTER TABLE "Movement" ALTER COLUMN "balanceAfter" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
