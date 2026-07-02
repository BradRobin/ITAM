BEGIN;

-- Do not enable RLS on Django system tables. Session/auth tables need full
-- application access or users will be logged out unexpectedly.
-- Apply inventory table policies separately if needed.

ALTER TABLE IF EXISTS "inventory_asset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "inventory_employee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "inventory_assignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "inventory_maintenancelog" ENABLE ROW LEVEL SECURITY;

COMMIT;
