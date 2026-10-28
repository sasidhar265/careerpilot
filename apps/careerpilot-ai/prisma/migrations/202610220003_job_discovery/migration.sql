-- Additive discovery migration. Existing jobs, applications and private data remain.
-- pg_trgm must be available to the migration role on managed PostgreSQL.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
ALTER TABLE "Employer"
 ADD COLUMN "industry" TEXT, ADD COLUMN "companySize" TEXT, ADD COLUMN "companyType" TEXT,
 ADD COLUMN "description" TEXT, ADD COLUMN "metadataSourceUrl" TEXT, ADD COLUMN "metadataVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Job"
 ADD COLUMN "canonicalUrl" TEXT, ADD COLUMN "applicationUrl" TEXT,
 ADD COLUMN "duplicateFingerprint" TEXT, ADD COLUMN "duplicateOfId" TEXT,
 ADD COLUMN "requirements" TEXT NOT NULL DEFAULT '', ADD COLUMN "benefits" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], ADD COLUMN "employmentType" TEXT,
 ADD COLUMN "seniority" TEXT, ADD COLUMN "experienceMinYears" DOUBLE PRECISION, ADD COLUMN "experienceMaxYears" DOUBLE PRECISION,
 ADD COLUMN "experienceEvidence" TEXT, ADD COLUMN "industry" TEXT, ADD COLUMN "department" TEXT,
 ADD COLUMN "visaSponsorship" BOOLEAN, ADD COLUMN "visaEvidence" TEXT, ADD COLUMN "visaVerifiedAt" TIMESTAMP(3),
 ADD COLUMN "lastVerifiedAt" TIMESTAMP(3), ADD COLUMN "potentiallyExpiredAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Job_canonicalUrl_key" ON "Job"("canonicalUrl");
CREATE INDEX "Job_duplicateFingerprint_idx" ON "Job"("duplicateFingerprint");
CREATE INDEX "Job_duplicateOfId_idx" ON "Job"("duplicateOfId");
CREATE INDEX "Job_lastVerifiedAt_idx" ON "Job"("lastVerifiedAt");
CREATE INDEX "Job_publishedAt_idx" ON "Job"("publishedAt");
CREATE INDEX "Job_salaryMax_idx" ON "Job"("salaryMax");
ALTER TABLE "Job" ADD CONSTRAINT "Job_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Job_search_text_idx" ON "Job" USING GIN(to_tsvector('simple',coalesce("title",'') || ' ' || coalesce("description",'')));
CREATE INDEX "Job_title_trgm_idx" ON "Job" USING GIN("title" gin_trgm_ops);
CREATE INDEX "Job_description_trgm_idx" ON "Job" USING GIN("description" gin_trgm_ops);
CREATE INDEX "Employer_name_trgm_idx" ON "Employer" USING GIN("name" gin_trgm_ops);
CREATE TABLE "JobSource" (
 "id" TEXT PRIMARY KEY, "key" TEXT NOT NULL, "provider" TEXT NOT NULL, "board" TEXT NOT NULL,
 "region" TEXT NOT NULL DEFAULT 'global', "employerId" TEXT NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT true,
 "status" TEXT NOT NULL DEFAULT 'UNVERIFIED', "lastAttemptAt" TIMESTAMP(3), "lastSuccessAt" TIMESTAMP(3),
 "lastCompleteAt" TIMESTAMP(3), "lastErrorCode" TEXT, "collectionNote" TEXT,
 "failureCount" INTEGER NOT NULL DEFAULT 0, "nextRefreshAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "leaseOwner" TEXT, "leaseUntil" TIMESTAMP(3),
 CONSTRAINT "JobSource_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "Employer"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "JobSource_key_key" ON "JobSource"("key");
CREATE INDEX "JobSource_enabled_nextRefreshAt_idx" ON "JobSource"("enabled","nextRefreshAt");
CREATE TABLE "JobObservation" (
 "id" TEXT PRIMARY KEY, "sourceId" TEXT NOT NULL, "externalId" TEXT NOT NULL, "jobId" TEXT NOT NULL,
 "canonicalUrl" TEXT NOT NULL, "applicationUrl" TEXT, "lastVerifiedAt" TIMESTAMP(3) NOT NULL, "missingSince" TIMESTAMP(3),
 CONSTRAINT "JobObservation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "JobSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "JobObservation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "JobObservation_sourceId_externalId_key" ON "JobObservation"("sourceId","externalId");
CREATE INDEX "JobObservation_jobId_missingSince_idx" ON "JobObservation"("jobId","missingSince");
CREATE TABLE "JobLocation" (
 "id" TEXT PRIMARY KEY, "jobId" TEXT NOT NULL, "label" TEXT NOT NULL, "latitude" DOUBLE PRECISION NOT NULL,
 "longitude" DOUBLE PRECISION NOT NULL, "provenance" TEXT NOT NULL,
 CONSTRAINT "JobLocation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "JobLocation_valid_coordinates" CHECK ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180)
);
CREATE UNIQUE INDEX "JobLocation_jobId_label_key" ON "JobLocation"("jobId","label");
CREATE INDEX "JobLocation_latitude_longitude_idx" ON "JobLocation"("latitude","longitude");
CREATE TABLE "SavedSearch" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "name" TEXT NOT NULL, "queryString" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SavedSearch_userId_name_key" ON "SavedSearch"("userId","name");
CREATE TABLE "SavedJob" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "jobId" TEXT NOT NULL,
 "saved" BOOLEAN NOT NULL DEFAULT false, "hidden" BOOLEAN NOT NULL DEFAULT false, "collection" TEXT NOT NULL DEFAULT '',
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "SavedJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "SavedJob_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SavedJob_userId_jobId_key" ON "SavedJob"("userId","jobId");
CREATE INDEX "SavedJob_userId_saved_collection_idx" ON "SavedJob"("userId","saved","collection");
-- Preserve the current shortlist as bookmarks, including removed-from-shortlist state.
INSERT INTO "SavedJob"("id","userId","jobId","saved","updatedAt")
 SELECT 'migrated_' || "id","userId","jobId",NOT "hidden","updatedAt" FROM "Application";
