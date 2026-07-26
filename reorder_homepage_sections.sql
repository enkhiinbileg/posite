-- World-Class Performance Optimization: Bulk Reordering RPC
-- This function allows updating multiple section order_indices in a single database transaction.

CREATE OR REPLACE FUNCTION reorder_homepage_sections(section_updates JSONB)
RETURNS VOID AS $$
DECLARE
  update_record RECORD;
BEGIN
  FOR update_record IN SELECT * FROM jsonb_to_recordset(section_updates) AS x(id INT, order_index INT)
  LOOP
    UPDATE homepage_sections
    SET order_index = update_record.order_index
    WHERE id = update_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
