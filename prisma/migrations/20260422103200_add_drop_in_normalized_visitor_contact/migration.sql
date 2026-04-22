ALTER TABLE "DropInVisit"
ADD COLUMN "normalizedVisitorContact" TEXT;

UPDATE "DropInVisit"
SET "normalizedVisitorContact" = LOWER(BTRIM("visitorContact"))
WHERE "visitorContact" IS NOT NULL;

CREATE INDEX "DropInVisit_gymId_normalizedVisitorContact_visitedAt_idx"
ON "DropInVisit"("gymId", "normalizedVisitorContact", "visitedAt");
