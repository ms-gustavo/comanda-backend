-- CreateTable
CREATE TABLE "RateioEntry" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateioEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateioEntry_participantId_idx" ON "RateioEntry"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "RateioEntry_itemId_participantId_key" ON "RateioEntry"("itemId", "participantId");

-- AddForeignKey
ALTER TABLE "RateioEntry" ADD CONSTRAINT "RateioEntry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateioEntry" ADD CONSTRAINT "RateioEntry_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
