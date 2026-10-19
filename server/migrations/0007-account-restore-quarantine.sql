CREATE TABLE account_recovery_control (
  singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
  mode TEXT NOT NULL CHECK (mode IN ('normal','quarantined')),
  generation UUID NOT NULL DEFAULT pg_catalog.gen_random_uuid(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO account_recovery_control(singleton,mode) VALUES(true,'normal');
