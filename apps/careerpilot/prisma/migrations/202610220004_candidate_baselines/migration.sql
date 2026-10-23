-- Additive private originals and immutable profile history; no baseline is selected implicitly.
ALTER TABLE "Document" ADD COLUMN "originalCiphertext" BYTEA, ADD COLUMN "originalKeyId" TEXT,
 ADD COLUMN "sizeBytes" INTEGER, ADD COLUMN "extractionDiagnostics" JSONB, ADD COLUMN "pageMap" JSONB;
ALTER TABLE "Document" ADD CONSTRAINT "Document_original_envelope_complete" CHECK (
 ("originalCiphertext" IS NULL AND "originalKeyId" IS NULL AND "sizeBytes" IS NULL) OR
 ("originalCiphertext" IS NOT NULL AND "originalKeyId" IS NOT NULL AND "sizeBytes" BETWEEN 1 AND 20971520));
CREATE TABLE "ResumeBaseline" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "documentId" TEXT NOT NULL, "title" TEXT NOT NULL,
 "revision" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ResumeBaseline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "ResumeBaseline_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ResumeBaseline_documentId_key" ON "ResumeBaseline"("documentId");
CREATE INDEX "ResumeBaseline_userId_createdAt_idx" ON "ResumeBaseline"("userId","createdAt");
CREATE TABLE "ProfileVersion" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "baselineId" TEXT, "revision" INTEGER NOT NULL,
 "parentId" TEXT, "data" JSONB NOT NULL, "transcription" TEXT, "preferences" JSONB, "diagnostics" JSONB NOT NULL, "method" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'DRAFT', "reviewedAt" TIMESTAMP(3), "resumeId" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ProfileVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "ProfileVersion_baselineId_fkey" FOREIGN KEY ("baselineId") REFERENCES "ResumeBaseline"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ProfileVersion_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProfileVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 CONSTRAINT "ProfileVersion_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 CONSTRAINT "ProfileVersion_valid_status" CHECK ("status" IN ('DRAFT','CONFIRMED')),
 CONSTRAINT "ProfileVersion_reviewed" CHECK ("status" <> 'CONFIRMED' OR "reviewedAt" IS NOT NULL)
);
CREATE UNIQUE INDEX "ProfileVersion_baselineId_revision_key" ON "ProfileVersion"("baselineId","revision");
CREATE UNIQUE INDEX "ProfileVersion_resumeId_key" ON "ProfileVersion"("resumeId");
CREATE INDEX "ProfileVersion_userId_createdAt_idx" ON "ProfileVersion"("userId","createdAt");
ALTER TABLE "CandidateProfile" ADD COLUMN "activeBaselineId" TEXT, ADD COLUMN "activeVersionId" TEXT;
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_activeBaselineId_fkey" FOREIGN KEY ("activeBaselineId") REFERENCES "ResumeBaseline"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "ProfileVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- Immutable originals and version payloads even if an application bug attempts an UPDATE.
CREATE FUNCTION careerpilot_immutable_document() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Original documents are immutable'; END; $$;
CREATE TRIGGER "Document_immutable" BEFORE UPDATE ON "Document" FOR EACH ROW EXECUTE FUNCTION careerpilot_immutable_document();
CREATE FUNCTION careerpilot_immutable_profile_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."userId" IS DISTINCT FROM OLD."userId" OR NEW."baselineId" IS DISTINCT FROM OLD."baselineId"
 OR NEW."revision" IS DISTINCT FROM OLD."revision" OR NEW."data" IS DISTINCT FROM OLD."data"
 OR NEW."preferences" IS DISTINCT FROM OLD."preferences" OR NEW."transcription" IS DISTINCT FROM OLD."transcription" OR NEW."diagnostics" IS DISTINCT FROM OLD."diagnostics" OR NEW."method" IS DISTINCT FROM OLD."method"
 OR NEW."status" IS DISTINCT FROM OLD."status" OR NEW."reviewedAt" IS DISTINCT FROM OLD."reviewedAt"
 OR (NEW."parentId" IS DISTINCT FROM OLD."parentId" AND NEW."parentId" IS NOT NULL)
 OR (NEW."resumeId" IS DISTINCT FROM OLD."resumeId" AND NEW."resumeId" IS NOT NULL)
 OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN RAISE EXCEPTION 'Profile revisions are immutable'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER "ProfileVersion_immutable" BEFORE UPDATE ON "ProfileVersion" FOR EACH ROW EXECUTE FUNCTION careerpilot_immutable_profile_version();
-- Ownership and baseline association checks apply in addition to server-side owner queries.
CREATE FUNCTION careerpilot_profile_ownership() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id TEXT; version_baseline TEXT; version_status TEXT;
BEGIN
 IF TG_TABLE_NAME='ResumeBaseline' THEN
  SELECT "userId" INTO owner_id FROM "Document" WHERE id=NEW."documentId";
  IF owner_id IS DISTINCT FROM NEW."userId" THEN RAISE EXCEPTION 'Document owner mismatch'; END IF;
  IF TG_OP='UPDATE' AND (NEW."documentId" IS DISTINCT FROM OLD."documentId" OR NEW."userId" IS DISTINCT FROM OLD."userId") THEN RAISE EXCEPTION 'Baseline identity is immutable'; END IF;
 ELSIF TG_TABLE_NAME='ProfileVersion' THEN
  IF NEW."baselineId" IS NOT NULL THEN
   SELECT "userId" INTO owner_id FROM "ResumeBaseline" WHERE id=NEW."baselineId";
   IF owner_id IS DISTINCT FROM NEW."userId" THEN RAISE EXCEPTION 'Baseline owner mismatch'; END IF;
  END IF;
  IF NEW."parentId" IS NOT NULL THEN
   SELECT "userId","baselineId" INTO owner_id,version_baseline FROM "ProfileVersion" WHERE id=NEW."parentId";
   IF owner_id IS DISTINCT FROM NEW."userId" OR version_baseline IS DISTINCT FROM NEW."baselineId" THEN RAISE EXCEPTION 'Revision parent mismatch'; END IF;
  END IF;
  IF NEW."resumeId" IS NOT NULL THEN
   SELECT "userId" INTO owner_id FROM "Resume" WHERE id=NEW."resumeId";
   IF owner_id IS DISTINCT FROM NEW."userId" THEN RAISE EXCEPTION 'Resume owner mismatch'; END IF;
  END IF;
 ELSE
  IF NEW."activeBaselineId" IS NOT NULL THEN
   SELECT "userId" INTO owner_id FROM "ResumeBaseline" WHERE id=NEW."activeBaselineId";
   IF owner_id IS DISTINCT FROM NEW."userId" THEN RAISE EXCEPTION 'Active baseline owner mismatch'; END IF;
  END IF;
  IF NEW."activeVersionId" IS NOT NULL THEN
   SELECT "userId","baselineId","status" INTO owner_id,version_baseline,version_status FROM "ProfileVersion" WHERE id=NEW."activeVersionId";
   IF owner_id IS DISTINCT FROM NEW."userId" OR version_baseline IS DISTINCT FROM NEW."activeBaselineId" OR version_status<>'CONFIRMED' THEN RAISE EXCEPTION 'Active revision mismatch'; END IF;
  ELSIF NEW."activeBaselineId" IS NOT NULL THEN RAISE EXCEPTION 'An active baseline requires a confirmed revision';
  END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER "ResumeBaseline_ownership" BEFORE INSERT OR UPDATE ON "ResumeBaseline" FOR EACH ROW EXECUTE FUNCTION careerpilot_profile_ownership();
CREATE TRIGGER "ProfileVersion_ownership" BEFORE INSERT OR UPDATE ON "ProfileVersion" FOR EACH ROW EXECUTE FUNCTION careerpilot_profile_ownership();
CREATE TRIGGER "CandidateProfile_baseline_ownership" BEFORE INSERT OR UPDATE ON "CandidateProfile" FOR EACH ROW EXECUTE FUNCTION careerpilot_profile_ownership();
CREATE FUNCTION careerpilot_immutable_resume() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."userId" IS DISTINCT FROM OLD."userId" OR NEW."text" IS DISTINCT FROM OLD."text"
 OR NEW."title" IS DISTINCT FROM OLD."title" OR NEW."kind" IS DISTINCT FROM OLD."kind"
 OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN RAISE EXCEPTION 'Resume versions are immutable'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER "Resume_immutable" BEFORE UPDATE ON "Resume" FOR EACH ROW EXECUTE FUNCTION careerpilot_immutable_resume();
