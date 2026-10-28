CREATE TABLE "BuilderSession" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "analysisId" TEXT NOT NULL REFERENCES "MatchAnalysis"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "profileVersionId" TEXT NOT NULL REFERENCES "ProfileVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "proposals" JSONB NOT NULL, "questions" JSONB NOT NULL, "discarded" JSONB NOT NULL,
 "revision" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "BuilderSession_userId_createdAt_idx" ON "BuilderSession"("userId","createdAt");
CREATE TABLE "BuilderVersion" (
 "id" TEXT PRIMARY KEY, "sessionId" TEXT NOT NULL REFERENCES "BuilderSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "revision" INTEGER NOT NULL, "parentId" TEXT REFERENCES "BuilderVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "document" JSONB NOT NULL, "text" TEXT NOT NULL, "decisions" JSONB NOT NULL, "template" TEXT NOT NULL,
 "lengthTarget" INTEGER NOT NULL, "status" TEXT NOT NULL, "approvedAt" TIMESTAMP(3),
 "readiness" JSONB NOT NULL, "evidence" JSONB NOT NULL, "exportValidation" JSONB,
 "resumeId" TEXT UNIQUE REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "BuilderVersion_valid_status" CHECK ("status" IN ('DRAFT','APPROVED')),
 CONSTRAINT "BuilderVersion_approval" CHECK ("status" <> 'APPROVED' OR ("approvedAt" IS NOT NULL AND "resumeId" IS NOT NULL AND "exportValidation" IS NOT NULL)),
 CONSTRAINT "BuilderVersion_template" CHECK ("template" IN ('classic-uk','compact-uk')),
 CONSTRAINT "BuilderVersion_length" CHECK ("lengthTarget" BETWEEN 200 AND 2000)
);
CREATE UNIQUE INDEX "BuilderVersion_sessionId_revision_key" ON "BuilderVersion"("sessionId","revision");
CREATE FUNCTION careerpilot_builder_session_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id TEXT; profile_id TEXT;
BEGIN
 SELECT "userId","profileVersionId" INTO owner_id,profile_id FROM "MatchAnalysis" WHERE id=NEW."analysisId";
 IF owner_id IS DISTINCT FROM NEW."userId" OR profile_id IS DISTINCT FROM NEW."profileVersionId" THEN RAISE EXCEPTION 'Builder source owner mismatch'; END IF;
 IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'revision') IS DISTINCT FROM (to_jsonb(OLD)-'revision') THEN RAISE EXCEPTION 'Builder source is immutable'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER "BuilderSession_guard" BEFORE INSERT OR UPDATE ON "BuilderSession" FOR EACH ROW EXECUTE FUNCTION careerpilot_builder_session_guard();
CREATE FUNCTION careerpilot_builder_version_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id TEXT; resume_owner TEXT; parent_session TEXT;
BEGIN
 IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'parentId') IS DISTINCT FROM (to_jsonb(OLD)-'parentId') THEN RAISE EXCEPTION 'Builder versions are immutable'; END IF;
 IF TG_OP='UPDATE' AND NEW."parentId" IS DISTINCT FROM OLD."parentId" AND NEW."parentId" IS NOT NULL THEN RAISE EXCEPTION 'Builder parent is immutable'; END IF;
 IF NEW."parentId" IS NOT NULL THEN SELECT "sessionId" INTO parent_session FROM "BuilderVersion" WHERE id=NEW."parentId";IF parent_session IS DISTINCT FROM NEW."sessionId" THEN RAISE EXCEPTION 'Builder parent mismatch'; END IF;END IF;
 IF NEW."resumeId" IS NOT NULL THEN
  SELECT "userId" INTO owner_id FROM "BuilderSession" WHERE id=NEW."sessionId";
  SELECT "userId" INTO resume_owner FROM "Resume" WHERE id=NEW."resumeId";
  IF owner_id IS DISTINCT FROM resume_owner THEN RAISE EXCEPTION 'Builder resume owner mismatch'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER "BuilderVersion_guard" BEFORE INSERT OR UPDATE ON "BuilderVersion" FOR EACH ROW EXECUTE FUNCTION careerpilot_builder_version_guard();
