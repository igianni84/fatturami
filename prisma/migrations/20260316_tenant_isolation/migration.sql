-- Phase 2: Tenant Isolation — add userId to all tenant models
-- Strategy: ADD COLUMN nullable → UPDATE backfill → ALTER SET NOT NULL → ADD FK → rebuild indexes/uniques

-- Step 1: Add nullable userId columns
ALTER TABLE "Company" ADD COLUMN "userId" TEXT;
ALTER TABLE "Client" ADD COLUMN "userId" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "userId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "userId" TEXT;
ALTER TABLE "Quote" ADD COLUMN "userId" TEXT;
ALTER TABLE "CreditNote" ADD COLUMN "userId" TEXT;
ALTER TABLE "PurchaseInvoice" ADD COLUMN "userId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "userId" TEXT;

-- Step 2: Backfill — assign all existing records to the first user
UPDATE "Company" SET "userId" = (SELECT "id" FROM "User" LIMIT 1) WHERE "userId" IS NULL;
UPDATE "Client" SET "userId" = (SELECT "id" FROM "User" LIMIT 1) WHERE "userId" IS NULL;
UPDATE "Supplier" SET "userId" = (SELECT "id" FROM "User" LIMIT 1) WHERE "userId" IS NULL;
UPDATE "Invoice" SET "userId" = (SELECT "id" FROM "User" LIMIT 1) WHERE "userId" IS NULL;
UPDATE "Quote" SET "userId" = (SELECT "id" FROM "User" LIMIT 1) WHERE "userId" IS NULL;
UPDATE "CreditNote" SET "userId" = (SELECT "id" FROM "User" LIMIT 1) WHERE "userId" IS NULL;
UPDATE "PurchaseInvoice" SET "userId" = (SELECT "id" FROM "User" LIMIT 1) WHERE "userId" IS NULL;
UPDATE "Expense" SET "userId" = (SELECT "id" FROM "User" LIMIT 1) WHERE "userId" IS NULL;

-- Step 3: Set NOT NULL
ALTER TABLE "Company" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Client" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Supplier" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Invoice" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Quote" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "CreditNote" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "PurchaseInvoice" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Expense" ALTER COLUMN "userId" SET NOT NULL;

-- Step 4: Add foreign keys
ALTER TABLE "Company" ADD CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 5: Drop old unique indexes (these are indexes, not constraints)
DROP INDEX "Invoice_number_key";
DROP INDEX "Quote_number_key";
DROP INDEX "CreditNote_number_key";

-- Step 6: Add compound unique constraints (number unique per user)
ALTER TABLE "Company" ADD CONSTRAINT "Company_userId_key" UNIQUE ("userId");
CREATE UNIQUE INDEX "Invoice_userId_number_key" ON "Invoice"("userId", "number");
CREATE UNIQUE INDEX "Quote_userId_number_key" ON "Quote"("userId", "number");
CREATE UNIQUE INDEX "CreditNote_userId_number_key" ON "CreditNote"("userId", "number");

-- Step 7: Drop old indexes and create new tenant-scoped indexes
DROP INDEX IF EXISTS "Invoice_status_idx";
DROP INDEX IF EXISTS "Quote_status_idx";
DROP INDEX IF EXISTS "PurchaseInvoice_status_idx";
DROP INDEX IF EXISTS "CreditNote_invoiceId_idx";
DROP INDEX IF EXISTS "Client_deletedAt_name_idx";
DROP INDEX IF EXISTS "Supplier_deletedAt_name_idx";

CREATE INDEX "Client_userId_deletedAt_name_idx" ON "Client"("userId", "deletedAt", "name");
CREATE INDEX "Supplier_userId_deletedAt_name_idx" ON "Supplier"("userId", "deletedAt", "name");
CREATE INDEX "Invoice_userId_status_idx" ON "Invoice"("userId", "status");
CREATE INDEX "Quote_userId_status_idx" ON "Quote"("userId", "status");
CREATE INDEX "CreditNote_userId_invoiceId_idx" ON "CreditNote"("userId", "invoiceId");
CREATE INDEX "PurchaseInvoice_userId_status_idx" ON "PurchaseInvoice"("userId", "status");
CREATE INDEX "Expense_userId_idx" ON "Expense"("userId");
