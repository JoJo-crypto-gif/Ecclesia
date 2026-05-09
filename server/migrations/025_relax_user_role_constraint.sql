-- Migration 025: Relax User Role Constraint
-- Drop the check constraint that limits roles to 'admin' and 'zone_leader'
-- so we can use custom roles from the roles table.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Optionally, add a new one that just ensures it's not empty, 
-- but since the column is NOT NULL, we are already covered.
