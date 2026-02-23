/*
  Warnings:

  - You are about to drop the `MenuCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MenuItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WeddingMenuItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "MenuSectionType" AS ENUM ('ZUPA', 'DANIE_GLOWNE', 'SUROWKI', 'DESER', 'CIEPLA_1', 'CIEPLA_2', 'CIEPLA_3', 'ZIMNA_PLYTA', 'SALATKI');

-- DropForeignKey
ALTER TABLE "MenuItem" DROP CONSTRAINT "MenuItem_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "WeddingMenuItem" DROP CONSTRAINT "WeddingMenuItem_menuItemId_fkey";

-- DropForeignKey
ALTER TABLE "WeddingMenuItem" DROP CONSTRAINT "WeddingMenuItem_weddingId_fkey";

-- DropTable
DROP TABLE "MenuCategory";

-- DropTable
DROP TABLE "MenuItem";

-- DropTable
DROP TABLE "WeddingMenuItem";

-- CreateTable
CREATE TABLE "MenuDish" (
    "id" TEXT NOT NULL,
    "section" "MenuSectionType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuDish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeddingMenuSelection" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "mainCourseMode" TEXT,
    "dessertChoice" TEXT,
    "dishId" TEXT,
    "section" "MenuSectionType" NOT NULL,
    "slotIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeddingMenuSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeddingMenuConfig" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "mainCourseMode" TEXT,
    "dessertChoice" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeddingMenuConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeddingMenuSelection_weddingId_section_slotIndex_key" ON "WeddingMenuSelection"("weddingId", "section", "slotIndex");

-- CreateIndex
CREATE UNIQUE INDEX "WeddingMenuConfig_weddingId_key" ON "WeddingMenuConfig"("weddingId");

-- AddForeignKey
ALTER TABLE "WeddingMenuSelection" ADD CONSTRAINT "WeddingMenuSelection_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingMenuSelection" ADD CONSTRAINT "WeddingMenuSelection_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "MenuDish"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingMenuConfig" ADD CONSTRAINT "WeddingMenuConfig_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
