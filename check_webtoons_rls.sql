
-- Check RLS on 'webtoons'
SELECT * FROM pg_policies WHERE tablename = 'webtoons';

-- Check is_admin function existence
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'is_admin';
