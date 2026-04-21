ALTER TABLE "PlanTier" ADD COLUMN "normalizedName" TEXT;

UPDATE "PlanTier"
SET "normalizedName" = lower(btrim("name"));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT "gymId", "normalizedName", COUNT(*) AS duplicate_count
      FROM "PlanTier"
      GROUP BY "gymId", "normalizedName"
      HAVING COUNT(*) > 1
    ) duplicates
  ) THEN
    RAISE EXCEPTION 'Cannot add case-insensitive PlanTier uniqueness: duplicate names exist within at least one gym.';
  END IF;
END $$;

ALTER TABLE "PlanTier" ALTER COLUMN "normalizedName" SET NOT NULL;

CREATE UNIQUE INDEX "PlanTier_gymId_normalizedName_key" ON "PlanTier"("gymId", "normalizedName");
