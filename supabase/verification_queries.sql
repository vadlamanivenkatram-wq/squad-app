-- Squad App - Supabase Verification & Testing Queries
-- Use these queries to verify the schema and test operations

-- ============================================================================
-- SCHEMA VERIFICATION
-- ============================================================================

-- List all tables and their row counts
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check all indexes
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- DATA VERIFICATION QUERIES
-- ============================================================================

-- Count records in each table
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'groups', COUNT(*) FROM groups
UNION ALL
SELECT 'group_members', COUNT(*) FROM group_members
UNION ALL
SELECT 'events', COUNT(*) FROM events
UNION ALL
SELECT 'rsvps', COUNT(*) FROM rsvps
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'locations', COUNT(*) FROM locations;

-- ============================================================================
-- USER QUERIES (Testing Authentication Flow)
-- ============================================================================

-- Find user by email (Google OAuth)
SELECT * FROM users WHERE email = 'user@example.com';

-- Find user by username (Manual auth)
SELECT * FROM users WHERE username = 'john_doe';

-- Get user's groups
SELECT g.* FROM groups g
JOIN group_members gm ON g.id = gm.group_id
WHERE gm.user_id = '{user_id}'
ORDER BY g.created_at DESC;

-- ============================================================================
-- GROUP QUERIES
-- ============================================================================

-- Find group by join code
SELECT * FROM groups WHERE code = '1234';

-- Get all members of a group
SELECT u.* FROM users u
JOIN group_members gm ON u.id = gm.user_id
WHERE gm.group_id = '{group_id}';

-- Get group details with member count
SELECT
  g.*,
  COUNT(gm.user_id) as member_count
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
WHERE g.id = '{group_id}'
GROUP BY g.id;

-- ============================================================================
-- EVENT QUERIES
-- ============================================================================

-- Get all events for a group (sorted by datetime)
SELECT * FROM events
WHERE group_id = '{group_id}'
AND status = 'upcoming'
ORDER BY datetime ASC;

-- Get event with RSVP summary
SELECT
  e.*,
  COUNT(CASE WHEN r.response = 'yes' THEN 1 END) as yes_count,
  COUNT(CASE WHEN r.response = 'no' THEN 1 END) as no_count,
  COUNT(CASE WHEN r.response IS NULL THEN 1 END) as pending_count
FROM events e
LEFT JOIN rsvps r ON e.id = r.event_id
WHERE e.id = '{event_id}'
GROUP BY e.id;

-- Get user's RSVP for an event
SELECT * FROM rsvps
WHERE event_id = '{event_id}' AND user_id = '{user_id}';

-- Get all users who RSVP'd "yes" for an event
SELECT u.* FROM users u
JOIN rsvps r ON u.id = r.user_id
WHERE r.event_id = '{event_id}' AND r.response = 'yes';

-- ============================================================================
-- MESSAGE QUERIES
-- ============================================================================

-- Get recent group messages (last 50)
SELECT
  m.*,
  u.color as user_color
FROM messages m
JOIN users u ON m.user_id = u.id
WHERE m.group_id = '{group_id}'
ORDER BY m.created_at DESC
LIMIT 50;

-- Get message count for a group
SELECT COUNT(*) as message_count FROM messages
WHERE group_id = '{group_id}';

-- ============================================================================
-- LOCATION QUERIES
-- ============================================================================

-- Get all live locations for an event
SELECT * FROM locations
WHERE event_id = '{event_id}'
ORDER BY updated_at DESC;

-- Get specific user's location on an event
SELECT * FROM locations
WHERE event_id = '{event_id}' AND user_id = '{user_id}';

-- Get users sharing locations on an event (recently updated)
SELECT
  l.*,
  EXTRACT(EPOCH FROM (NOW() - l.updated_at)) as seconds_since_update
FROM locations l
WHERE l.event_id = '{event_id}'
AND l.updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY l.updated_at DESC;

-- ============================================================================
-- RELATIONSHIP VERIFICATION
-- ============================================================================

-- Verify foreign key integrity: events without valid host
SELECT e.* FROM events e
LEFT JOIN users u ON e.host_id = u.id
WHERE u.id IS NULL;

-- Verify foreign key integrity: events without valid group
SELECT e.* FROM events e
LEFT JOIN groups g ON e.group_id = g.id
WHERE g.id IS NULL;

-- Verify foreign key integrity: rsvps without valid event
SELECT r.* FROM rsvps r
LEFT JOIN events e ON r.event_id = e.id
WHERE e.id IS NULL;

-- Verify foreign key integrity: messages without valid group
SELECT m.* FROM messages m
LEFT JOIN groups g ON m.group_id = g.id
WHERE g.id IS NULL;

-- ============================================================================
-- PERFORMANCE TESTING QUERIES
-- ============================================================================

-- Test: Get user's full dashboard (groups, events, messages)
WITH user_groups AS (
  SELECT g.* FROM groups g
  JOIN group_members gm ON g.id = gm.group_id
  WHERE gm.user_id = '{user_id}'
)
SELECT
  g.id as group_id,
  g.name as group_name,
  COUNT(DISTINCT e.id) as event_count,
  COUNT(DISTINCT m.id) as message_count
FROM user_groups g
LEFT JOIN events e ON g.id = e.group_id
LEFT JOIN messages m ON g.id = m.group_id
GROUP BY g.id, g.name;

-- Test: Get user attendance stats
SELECT
  u.id,
  u.name,
  u.attended,
  u.total,
  u.streak,
  COUNT(r.event_id) as invited_count,
  COUNT(CASE WHEN r.response = 'yes' THEN 1 END) as yes_count,
  COUNT(CASE WHEN r.response = 'no' THEN 1 END) as no_count
FROM users u
LEFT JOIN rsvps r ON u.id = r.user_id
WHERE u.id = '{user_id}'
GROUP BY u.id;

-- ============================================================================
-- DATA CLEANUP/MAINTENANCE
-- ============================================================================

-- Update event status to ended after time has passed
UPDATE events
SET status = 'ended'
WHERE status = 'upcoming'
AND datetime < EXTRACT(EPOCH FROM NOW()) * 1000
AND updated_at < NOW() - INTERVAL '1 hour';

-- Delete old location records (older than 1 day)
DELETE FROM locations
WHERE updated_at < NOW() - INTERVAL '1 day';

-- Refresh location (upsert new location)
INSERT INTO locations (event_id, user_id, user_name, user_avatar, user_color, lat, lng, updated_at)
VALUES ('{event_id}', '{user_id}', '{user_name}', '{avatar}', '{color}', {lat}, {lng}, NOW())
ON CONFLICT (event_id, user_id)
DO UPDATE SET
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  updated_at = NOW();

-- ============================================================================
-- SAMPLE DATA INSERTION (for testing)
-- ============================================================================

-- Create test user
INSERT INTO users (name, email, avatar, color, attended, total, streak)
VALUES ('John Doe', 'john@example.com', 'JD', '#6C63FF', 5, 8, 2)
RETURNING id;

-- Create test group
INSERT INTO groups (name, code, created_by)
VALUES ('Test Crew', '1234', '{user_id}')
RETURNING id;

-- Add user to group
INSERT INTO group_members (group_id, user_id)
VALUES ('{group_id}', '{user_id}')
ON CONFLICT DO NOTHING;

-- Create test event
INSERT INTO events (
  title, type, location_address, location_lat, location_lng,
  date, time, datetime, description, host_id, group_id, status
)
VALUES (
  'Coffee Meetup', 'Hangout', 'Starbucks Downtown',
  40.7128, -74.0060, '2026-05-20', '15:00', 1747857600000,
  'Casual coffee with the crew', '{user_id}', '{group_id}', 'upcoming'
)
RETURNING id;

-- Create test message
INSERT INTO messages (group_id, text, user_id, user_name, user_color)
VALUES ('{group_id}', 'Hey everyone!', '{user_id}', 'John Doe', '#6C63FF')
RETURNING id;

-- Create test RSVP
INSERT INTO rsvps (event_id, user_id, response)
VALUES ('{event_id}', '{user_id}', 'yes')
ON CONFLICT DO UPDATE SET response = 'yes';

-- Create test location
INSERT INTO locations (event_id, user_id, user_name, user_avatar, user_color, lat, lng)
VALUES ('{event_id}', '{user_id}', 'John Doe', 'JD', '#6C63FF', 40.7128, -74.0060)
ON CONFLICT (event_id, user_id)
DO UPDATE SET lat = 40.7128, lng = -74.0060, updated_at = NOW();

-- ============================================================================
-- TESTING REAL-TIME SUBSCRIPTIONS
-- ============================================================================

-- After running schema, test real-time by opening these in separate browser tabs:
-- 1. Listen to messages: SELECT * FROM messages WHERE group_id = '{group_id}'
-- 2. Listen to locations: SELECT * FROM locations WHERE event_id = '{event_id}'
-- 3. Listen to rsvps: SELECT * FROM rsvps WHERE event_id = '{event_id}'
-- 4. Listen to events: SELECT * FROM events WHERE group_id = '{group_id}'

-- Then insert/update/delete data and observe updates in real-time

-- ============================================================================
-- MIGRATION STATUS CHECK
-- ============================================================================

-- Run this query to verify all data has been migrated
SELECT
  'Users' as entity,
  COUNT(*) as total_count,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as created_today
FROM users
UNION ALL
SELECT
  'Groups',
  COUNT(*),
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END)
FROM groups
UNION ALL
SELECT
  'Events',
  COUNT(*),
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END)
FROM events
UNION ALL
SELECT
  'Messages',
  COUNT(*),
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END)
FROM messages
UNION ALL
SELECT
  'RSVPs',
  COUNT(*),
  COUNT(CASE WHEN updated_at > NOW() - INTERVAL '24 hours' THEN 1 END)
FROM rsvps
UNION ALL
SELECT
  'Locations',
  COUNT(*),
  COUNT(CASE WHEN updated_at > NOW() - INTERVAL '24 hours' THEN 1 END)
FROM locations;
