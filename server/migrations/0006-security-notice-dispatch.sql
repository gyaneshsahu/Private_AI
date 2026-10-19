ALTER TABLE account_security_event
  DROP CONSTRAINT "account_security_event_deliveryState_check",
  ADD CONSTRAINT account_security_delivery_state CHECK (
    "deliveryState" IN ('pending','sent','dispatching','accepted','uncertain','blocked')
  ),
  ADD COLUMN "recipientEmail" TEXT,
  ADD COLUMN "dispatchToken" UUID,
  ADD COLUMN "dispatchedAt" TIMESTAMPTZ,
  ADD COLUMN "settledAt" TIMESTAMPTZ;

-- Historical intents lack proof of the recipient address at event creation.
-- Do not silently substitute the account's current address.
UPDATE account_security_event SET "deliveryState"='blocked'
  WHERE "deliveryState"='pending';
