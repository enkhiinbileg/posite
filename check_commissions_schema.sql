
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'commissions';

SELECT * FROM information_schema.triggers WHERE event_object_table = 'commissions';
