-- CreateEnum
CREATE TYPE "FarmType" AS ENUM ('CROPS', 'LIVESTOCK', 'MIXED', 'OTHER');

-- CreateTable
CREATE TABLE "Producer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "farmType" "FarmType" NOT NULL,
    "description" TEXT,
    "region" TEXT NOT NULL,
    "prefecture" TEXT NOT NULL,
    "commune" TEXT,
    "address" TEXT,
    "mainProducts" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Producer_userId_key" ON "Producer"("userId");

-- CreateIndex
CREATE INDEX "Producer_region_prefecture_idx" ON "Producer"("region", "prefecture");

-- AddForeignKey
ALTER TABLE "Producer" ADD CONSTRAINT "Producer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
