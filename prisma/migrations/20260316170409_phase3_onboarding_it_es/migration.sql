-- AlterEnum
ALTER TYPE "TaxRateType" ADD VALUE 'minimum';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "fiscalCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "pec" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sdiCode" TEXT NOT NULL DEFAULT '';
