CREATE TABLE "JobDescriptionVersion" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "text" TEXT NOT NULL, "sha256" TEXT NOT NULL, "sourceUrl" TEXT, "sourceJobId" TEXT,
 "analysis" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "JobDescriptionVersion_userId_createdAt_idx" ON "JobDescriptionVersion"("userId","createdAt");
CREATE TABLE "MatchAnalysis" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "resumeId" TEXT NOT NULL REFERENCES "Resume"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "profileVersionId" TEXT NOT NULL REFERENCES "ProfileVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "jdVersionId" TEXT NOT NULL REFERENCES "JobDescriptionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "resumeSha256" TEXT NOT NULL, "profileSha256" TEXT NOT NULL, "report" JSONB NOT NULL,
 "requirementsReviewedAt" TIMESTAMP(3) NOT NULL, "tailoredResumeId" TEXT REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "MatchAnalysis_userId_createdAt_idx" ON "MatchAnalysis"("userId","createdAt");
CREATE FUNCTION careerpilot_matching_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (to_jsonb(NEW)-'tailoredResumeId') IS DISTINCT FROM (to_jsonb(OLD)-'tailoredResumeId')
 OR (OLD."tailoredResumeId" IS NOT NULL AND NEW."tailoredResumeId" IS NOT NULL AND NEW."tailoredResumeId" IS DISTINCT FROM OLD."tailoredResumeId") THEN RAISE EXCEPTION 'Analysis snapshots are immutable'; END IF;
 RETURN NEW;
END; $$;
-- Separate function avoids accessing MatchAnalysis-only fields on a JD record.
CREATE TRIGGER "JobDescriptionVersion_immutable" BEFORE UPDATE ON "JobDescriptionVersion" FOR EACH ROW EXECUTE FUNCTION careerpilot_immutable_document();
CREATE TRIGGER "MatchAnalysis_immutable" BEFORE UPDATE ON "MatchAnalysis" FOR EACH ROW EXECUTE FUNCTION careerpilot_matching_immutable();
CREATE FUNCTION careerpilot_matching_ownership() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id TEXT; linked_resume TEXT; state TEXT;
BEGIN
 SELECT "userId","resumeId","status" INTO owner_id,linked_resume,state FROM "ProfileVersion" WHERE id=NEW."profileVersionId";
 IF owner_id IS DISTINCT FROM NEW."userId" OR linked_resume IS DISTINCT FROM NEW."resumeId" OR state<>'CONFIRMED' THEN RAISE EXCEPTION 'Confirmed profile association mismatch'; END IF;
 SELECT "userId" INTO owner_id FROM "Resume" WHERE id=NEW."resumeId";
 IF owner_id IS DISTINCT FROM NEW."userId" THEN RAISE EXCEPTION 'Resume owner mismatch'; END IF;
 SELECT "userId" INTO owner_id FROM "JobDescriptionVersion" WHERE id=NEW."jdVersionId";
 IF owner_id IS DISTINCT FROM NEW."userId" THEN RAISE EXCEPTION 'JD owner mismatch'; END IF;
 IF NEW."tailoredResumeId" IS NOT NULL THEN
  SELECT "userId" INTO owner_id FROM "Resume" WHERE id=NEW."tailoredResumeId";
  IF owner_id IS DISTINCT FROM NEW."userId" THEN RAISE EXCEPTION 'Tailored resume owner mismatch'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER "MatchAnalysis_ownership" BEFORE INSERT OR UPDATE ON "MatchAnalysis" FOR EACH ROW EXECUTE FUNCTION careerpilot_matching_ownership();
