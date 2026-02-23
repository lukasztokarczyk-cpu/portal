-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MenuSectionType" ADD VALUE 'DODATKI_GLOWNE';
ALTER TYPE "MenuSectionType" ADD VALUE 'DODATKI_CIEPLA_1';
ALTER TYPE "MenuSectionType" ADD VALUE 'SUROWKA_CIEPLA_1';
ALTER TYPE "MenuSectionType" ADD VALUE 'DODATKI_CIEPLA_2';
ALTER TYPE "MenuSectionType" ADD VALUE 'SUROWKA_CIEPLA_2';
ALTER TYPE "MenuSectionType" ADD VALUE 'DODATKI_CIEPLA_3';
ALTER TYPE "MenuSectionType" ADD VALUE 'SUROWKA_CIEPLA_3';
