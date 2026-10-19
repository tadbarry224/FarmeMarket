-- CreateEnum
CREATE TYPE "ProductUnit" AS ENUM ('KG', 'TONNE', 'BAG', 'CRATE', 'BUNCH', 'PIECE', 'HEAD', 'LITER');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('AVAILABLE', 'SOLD_OUT', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "producerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit" "ProductUnit" NOT NULL,
    "pricePerUnit" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "prefecture" TEXT NOT NULL,
    "commune" TEXT,
    "availableFrom" DATE,
    "availableUntil" DATE,
    "quality" TEXT,
    "packaging" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_producerId_idx" ON "Product"("producerId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "Product_region_prefecture_idx" ON "Product"("region", "prefecture");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "Producer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
