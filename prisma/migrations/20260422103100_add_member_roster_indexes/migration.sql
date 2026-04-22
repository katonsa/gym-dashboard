CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Member_firstName_idx"
ON "Member" USING GIN ("firstName" gin_trgm_ops);

CREATE INDEX "Member_lastName_idx"
ON "Member" USING GIN ("lastName" gin_trgm_ops);

CREATE INDEX "Member_email_idx"
ON "Member" USING GIN ("email" gin_trgm_ops);

CREATE INDEX "Member_phone_idx"
ON "Member" USING GIN ("phone" gin_trgm_ops);

CREATE INDEX "Membership_memberId_status_currentPeriodEndsAt_idx"
ON "Membership"("memberId", "status", "currentPeriodEndsAt");

CREATE INDEX "MembershipPayment_memberId_status_dueAt_idx"
ON "MembershipPayment"("memberId", "status", "dueAt");
