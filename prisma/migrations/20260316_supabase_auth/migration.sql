-- AlterTable: Remove password, add supabaseId
ALTER TABLE "User" DROP COLUMN IF EXISTS "password";
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "supabaseId" TEXT;
UPDATE "User" SET "supabaseId" = 'placeholder-' || id WHERE "supabaseId" IS NULL;
ALTER TABLE "User" ALTER COLUMN "supabaseId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_supabaseId_key" ON "User"("supabaseId");
