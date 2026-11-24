-- AlterTable
ALTER TABLE "User" ADD COLUMN     "city" TEXT,
ADD COLUMN     "genres" JSONB,
ADD COLUMN     "openToCollab" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "bpm" INTEGER;

-- AlterTable
ALTER TABLE "FileAsset" ADD COLUMN     "durationSec" DOUBLE PRECISION,
ADD COLUMN     "peaks" JSONB;

-- AlterTable
ALTER TABLE "TaskCard" ADD COLUMN     "assigneeId" TEXT,
ADD COLUMN     "done" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dueDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "FileComment" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "atSeconds" DOUBLE PRECISION,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FileComment_fileId_idx" ON "FileComment"("fileId");

-- AddForeignKey
ALTER TABLE "TaskCard" ADD CONSTRAINT "TaskCard_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileComment" ADD CONSTRAINT "FileComment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileComment" ADD CONSTRAINT "FileComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
