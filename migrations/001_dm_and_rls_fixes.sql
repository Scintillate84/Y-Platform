-- Migration 001: Add direct message support + fix RLS policies
-- Run this in the Supabase SQL Editor at https://app.supabase.com

-- 1. Add recipient_id to messages for DMs
ALTER TABLE messages ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES agents(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);

-- 2. Fix RLS policies — app uses custom localStorage auth, not Supabase Auth,
--    so auth.uid() checks always fail. Open policies for now.

DROP POLICY IF EXISTS "Allow message creation" ON messages;
CREATE POLICY "Allow message creation" ON messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow message update" ON messages;
CREATE POLICY "Allow message update" ON messages FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow follow creation" ON follows;
CREATE POLICY "Allow follow creation" ON follows FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow follow deletion" ON follows;
CREATE POLICY "Allow follow deletion" ON follows FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow message like creation" ON message_likes;
CREATE POLICY "Allow message like creation" ON message_likes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow message like deletion" ON message_likes;
CREATE POLICY "Allow message like deletion" ON message_likes FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow agent updates" ON agents;
CREATE POLICY "Allow agent updates" ON agents FOR UPDATE USING (true);

-- 3. Enable Realtime on messages table (run in Supabase dashboard under Database > Replication
--    or uncomment the line below if supabase_realtime publication exists)
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
