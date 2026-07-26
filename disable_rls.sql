-- EMERGENCY DEBUG: DISABLE ALL SECURITY
-- Use this ONLY to check if data is visible.
-- If data appears after running this, the problem was definitely the Policies.

ALTER TABLE likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Reload Schema Cache just in case
NOTIFY pgrst, 'reload schema';
