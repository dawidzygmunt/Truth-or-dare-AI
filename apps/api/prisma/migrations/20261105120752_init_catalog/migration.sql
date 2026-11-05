-- CreateEnum
CREATE TYPE "GameEngine" AS ENUM ('card_deck');

-- CreateEnum
CREATE TYPE "EditionTier" AS ENUM ('free', 'paid');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('web', 'android');

-- CreateEnum
CREATE TYPE "CardKind" AS ENUM ('truth', 'dare', 'statement', 'challenge');

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "engine" "GameEngine" NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Edition" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" "EditionTier" NOT NULL,
    "productId" TEXT,
    "intensity" INTEGER NOT NULL,
    "ageRating" INTEGER NOT NULL,
    "platforms" "Platform"[],
    "locale" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Edition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "kind" "CardKind" NOT NULL,
    "template" TEXT NOT NULL,
    "tags" TEXT[],
    "intensity" INTEGER NOT NULL,
    "penaltyShots" INTEGER,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Edition_slug_key" ON "Edition"("slug");

-- CreateIndex
CREATE INDEX "Edition_gameId_idx" ON "Edition"("gameId");

-- CreateIndex
CREATE INDEX "Card_editionId_idx" ON "Card"("editionId");

-- AddForeignKey
ALTER TABLE "Edition" ADD CONSTRAINT "Edition_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
