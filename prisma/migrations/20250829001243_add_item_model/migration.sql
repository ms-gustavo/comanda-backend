-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "comandaId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Item_comandaId_idx" ON "Item"("comandaId");

-- CreateIndex
CREATE INDEX "Item_assignedToId_idx" ON "Item"("assignedToId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "Comanda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
