-- CreateEnum
CREATE TYPE "ClosingText" AS ENUM ('THANK_YOU_INFORM', 'RESPECTFULLY');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "closingText" "ClosingText" DEFAULT 'RESPECTFULLY',
ADD COLUMN     "departmentName" TEXT;
