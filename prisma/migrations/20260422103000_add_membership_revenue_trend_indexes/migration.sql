-- Supports subscription revenue-trend and active-membership range filters.
CREATE INDEX "Membership_memberId_startedAt_idx"
ON "Membership"("memberId", "startedAt");

CREATE INDEX "Membership_memberId_currentPeriodEndsAt_idx"
ON "Membership"("memberId", "currentPeriodEndsAt");
