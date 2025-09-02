-- AlterEnum
ALTER TYPE "ComandaStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Comanda" ADD COLUMN     "closedById" TEXT,
ADD COLUMN     "closingSummary" JSONB,
ADD COLUMN     "discountPct" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "serviceFeePct" DECIMAL(65,30) NOT NULL DEFAULT 0;
