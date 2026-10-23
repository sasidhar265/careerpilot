ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'DISCOVERED';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'PREPARING';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'SCREENING';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TABLE "Application" ALTER COLUMN "jobId" DROP NOT NULL;
ALTER TABLE "Application" DROP CONSTRAINT "Application_jobId_fkey";
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Application" ADD COLUMN "employerName" TEXT NOT NULL DEFAULT '', ADD COLUMN "roleTitle" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "location" TEXT NOT NULL DEFAULT '', ADD COLUMN "officialUrl" TEXT NOT NULL DEFAULT '', ADD COLUMN "duplicateKey" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1, ADD COLUMN "preparationNotes" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "recruiterName" TEXT NOT NULL DEFAULT '', ADD COLUMN "recruiterEmail" TEXT NOT NULL DEFAULT '', ADD COLUMN "recruiterPhone" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "interviewStages" JSONB NOT NULL DEFAULT '[]', ADD COLUMN "coverLetterDocumentId" TEXT,
 ADD COLUMN "interviewAt" TIMESTAMP(3), ADD COLUMN "offerAt" TIMESTAMP(3), ADD COLUMN "acceptedAt" TIMESTAMP(3);
UPDATE "Application" a SET "employerName"=e.name,"roleTitle"=j.title,location=j.location,"officialUrl"=COALESCE(j."applicationUrl",j.url),"duplicateKey"='job:'||a."jobId" FROM "Job" j JOIN "Employer" e ON e.id=j."employerId" WHERE j.id=a."jobId";
CREATE UNIQUE INDEX "Application_userId_duplicateKey_key" ON "Application"("userId","duplicateKey");
ALTER TABLE "Application" ADD CONSTRAINT "Application_coverLetterDocumentId_fkey" FOREIGN KEY ("coverLetterDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "ApplicationStatusEvent" (
 id TEXT PRIMARY KEY, "applicationId" TEXT NOT NULL REFERENCES "Application"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 "fromStatus" "ApplicationStatus", "toStatus" "ApplicationStatus" NOT NULL, source TEXT NOT NULL DEFAULT 'USER', "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ApplicationStatusEvent_applicationId_recordedAt_idx" ON "ApplicationStatusEvent"("applicationId","recordedAt");
INSERT INTO "ApplicationStatusEvent"(id,"applicationId","toStatus",source) SELECT 'legacy:'||id,id,status,'LEGACY_SNAPSHOT' FROM "Application";
CREATE FUNCTION careerpilot_application_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id TEXT;
BEGIN
 IF NEW."jobId" IS NOT NULL AND NEW."duplicateKey"='' THEN
  SELECT e.name,j.title,j.location,COALESCE(j."applicationUrl",j.url) INTO NEW."employerName",NEW."roleTitle",NEW.location,NEW."officialUrl" FROM "Job" j JOIN "Employer" e ON e.id=j."employerId" WHERE j.id=NEW."jobId";
  NEW."duplicateKey":='job:'||NEW."jobId";
 END IF;
 IF NEW."resumeId" IS NOT NULL THEN SELECT "userId" INTO owner_id FROM "Resume" WHERE id=NEW."resumeId";IF owner_id IS DISTINCT FROM NEW."userId" THEN RAISE EXCEPTION 'Resume owner mismatch';END IF;END IF;
 IF NEW."coverLetterDocumentId" IS NOT NULL THEN SELECT "userId" INTO owner_id FROM "Document" WHERE id=NEW."coverLetterDocumentId";IF owner_id IS DISTINCT FROM NEW."userId" THEN RAISE EXCEPTION 'Cover letter owner mismatch';END IF;END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER "Application_guard" BEFORE INSERT OR UPDATE ON "Application" FOR EACH ROW EXECUTE FUNCTION careerpilot_application_guard();
CREATE FUNCTION careerpilot_immutable_status_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Application status history is immutable';END; $$;
CREATE TRIGGER "ApplicationStatusEvent_immutable" BEFORE UPDATE ON "ApplicationStatusEvent" FOR EACH ROW EXECUTE FUNCTION careerpilot_immutable_status_event();
CREATE FUNCTION careerpilot_application_status_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN INSERT INTO "ApplicationStatusEvent"(id,"applicationId","toStatus") VALUES(md5(random()::text||clock_timestamp()::text||NEW.id),NEW.id,NEW.status);
 ELSIF NEW.status IS DISTINCT FROM OLD.status THEN INSERT INTO "ApplicationStatusEvent"(id,"applicationId","fromStatus","toStatus") VALUES(md5(random()::text||clock_timestamp()::text||NEW.id),NEW.id,OLD.status,NEW.status);END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER "Application_status_audit" AFTER INSERT OR UPDATE ON "Application" FOR EACH ROW EXECUTE FUNCTION careerpilot_application_status_audit();
