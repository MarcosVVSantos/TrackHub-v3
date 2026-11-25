-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('pending', 'shortlisted', 'approved', 'rejected');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'application_new';
ALTER TYPE "NotificationType" ADD VALUE 'application_approved';
ALTER TYPE "NotificationType" ADD VALUE 'application_rejected';

-- AlterTable
ALTER TABLE "EventInfo" ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EventApplication" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "city" TEXT,
    "trackId" TEXT,
    "sampleUrl" TEXT,
    "message" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventApplication_projectId_status_idx" ON "EventApplication"("projectId", "status");

-- CreateIndex
CREATE INDEX "EventApplication_userId_idx" ON "EventApplication"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventApplication_projectId_userId_key" ON "EventApplication"("projectId", "userId");

-- AddForeignKey
ALTER TABLE "EventApplication" ADD CONSTRAINT "EventApplication_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventApplication" ADD CONSTRAINT "EventApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventApplication" ADD CONSTRAINT "EventApplication_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;
