-- Sandbox database initialisation.
-- The sandbox user is locked down: it can only CREATE/DROP schemas,
-- not touch anything else.  This is the primary security boundary.

-- Revoke default public schema access
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO besql_sandbox;
