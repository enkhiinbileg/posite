-- Enable Real-time for notifications table
-- This ensures that the frontend receives updates immediately when a notification is inserted.
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
