-- Additive only: existing applications and resumes are preserved.
ALTER TABLE "Application" ADD COLUMN "resumeId" TEXT, ADD COLUMN "reminderAt" TIMESTAMP(3);
ALTER TABLE "Application" ADD CONSTRAINT "Application_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Application_resumeId_idx" ON "Application"("resumeId");
