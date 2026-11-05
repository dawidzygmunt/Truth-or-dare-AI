-- Prisma cannot model CHECK constraints in schema.prisma; they are kept here and in the
-- integration test. The ranges mirror packages/contracts (intensity 1-5, penaltyShots positive).

-- AddCheckConstraint
ALTER TABLE "Edition" ADD CONSTRAINT "Edition_intensity_range_check" CHECK ("intensity" BETWEEN 1 AND 5);

-- AddCheckConstraint
ALTER TABLE "Card" ADD CONSTRAINT "Card_intensity_range_check" CHECK ("intensity" BETWEEN 1 AND 5);

-- AddCheckConstraint
ALTER TABLE "Card" ADD CONSTRAINT "Card_penaltyShots_positive_check" CHECK ("penaltyShots" IS NULL OR "penaltyShots" > 0);
