-- CreateEnum
CREATE TYPE "TitlePrefix" AS ENUM ('MR', 'MRS', 'MISS');

-- CreateEnum
CREATE TYPE "Division" AS ENUM ('ADMINISTRATION', 'HR', 'FINANCE_ACCOUNTING', 'MARKETING', 'SALES', 'IT', 'CUSTOMER_SERVICE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "division" "Division",
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "position" TEXT,
ADD COLUMN     "titlePrefix" "TitlePrefix";
