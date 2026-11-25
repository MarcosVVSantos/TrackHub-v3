-- CreateEnum
CREATE TYPE "ProjectKind" AS ENUM ('track', 'event');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('show', 'battle', 'open_mic', 'party', 'other');

-- CreateEnum
CREATE TYPE "LineupStatus" AS ENUM ('invited', 'confirmed', 'declined');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'lineup_invite';
ALTER TYPE "NotificationType" ADD VALUE 'lineup_accept';
ALTER TYPE "NotificationType" ADD VALUE 'lineup_decline';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "kind" "ProjectKind" NOT NULL DEFAULT 'track';

-- CreateTable
CREATE TABLE "EventInfo" (
    "projectId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "EventType" NOT NULL DEFAULT 'show',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "venueName" TEXT,
    "venueAddress" TEXT,
    "ticketUrl" TEXT,
    "callOpen" BOOLEAN NOT NULL DEFAULT false,
    "callDeadline" TIMESTAMP(3),
    "callSlots" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventInfo_pkey" PRIMARY KEY ("projectId")
);

-- CreateTable
CREATE TABLE "LineupSlot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "startTime" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" "LineupStatus" NOT NULL DEFAULT 'invited',
    "feeCents" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineupSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_ownerId_kind_idx" ON "Project"("ownerId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "EventInfo_slug_key" ON "EventInfo"("slug");

-- CreateIndex
CREATE INDEX "EventInfo_startsAt_idx" ON "EventInfo"("startsAt");

-- CreateIndex
CREATE INDEX "LineupSlot_projectId_position_idx" ON "LineupSlot"("projectId", "position");

-- CreateIndex
CREATE INDEX "LineupSlot_userId_status_idx" ON "LineupSlot"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LineupSlot_projectId_userId_key" ON "LineupSlot"("projectId", "userId");

-- AddForeignKey
ALTER TABLE "EventInfo" ADD CONSTRAINT "EventInfo_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineupSlot" ADD CONSTRAINT "LineupSlot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineupSlot" ADD CONSTRAINT "LineupSlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
