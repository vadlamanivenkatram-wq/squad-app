-- Squad App Database Schema for Supabase
-- Created for migration from Firebase Firestore
-- Run this file in Supabase SQL Editor

-- ============================================================================
-- TABLE: users
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  password TEXT,
  avatar TEXT NOT NULL,
  color TEXT NOT NULL,
  attended INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Enable realtime for users
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- ============================================================================
-- TABLE: groups
-- ============================================================================
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_code ON groups(code);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);

-- Enable realtime for groups
ALTER PUBLICATION supabase_realtime ADD TABLE groups;

-- ============================================================================
-- TABLE: group_members (Junction table for many-to-many relationship)
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);

-- Enable realtime for group_members
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;

-- ============================================================================
-- TABLE: events
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  location_address TEXT,
  location_lat NUMERIC(10, 8),
  location_lng NUMERIC(11, 8),
  date TEXT, -- "YYYY-MM-DD" format
  time TEXT, -- "HH:MM" format
  datetime BIGINT, -- epoch milliseconds for sorting
  description TEXT,
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'upcoming', -- 'upcoming' or 'ended'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_group_id ON events(group_id);
CREATE INDEX IF NOT EXISTS idx_events_host_id ON events(host_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_datetime ON events(datetime);

-- Enable realtime for events
ALTER PUBLICATION supabase_realtime ADD TABLE events;

-- ============================================================================
-- TABLE: rsvps
-- ============================================================================
CREATE TABLE IF NOT EXISTS rsvps (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response TEXT, -- 'yes', 'no', or NULL for no response
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_rsvps_user_id ON rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_event_id ON rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_response ON rsvps(response);

-- Enable realtime for rsvps
ALTER PUBLICATION supabase_realtime ADD TABLE rsvps;

-- ============================================================================
-- TABLE: messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_group_created ON messages(group_id, created_at DESC);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ============================================================================
-- TABLE: locations
-- ============================================================================
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_avatar TEXT NOT NULL,
  user_color TEXT NOT NULL,
  lat NUMERIC(10, 8) NOT NULL,
  lng NUMERIC(11, 8) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_locations_event_id ON locations(event_id);
CREATE INDEX IF NOT EXISTS idx_locations_user_id ON locations(user_id);
CREATE INDEX IF NOT EXISTS idx_locations_updated_at ON locations(updated_at DESC);

-- Enable realtime for locations
ALTER PUBLICATION supabase_realtime ADD TABLE locations;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR USERS
-- ============================================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Allow reading other users in same groups
CREATE POLICY "Users can read group members"
  ON users FOR SELECT
  USING (
    id IN (
      SELECT DISTINCT u.id
      FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      JOIN group_members my_gm ON gm.group_id = my_gm.group_id
      WHERE my_gm.user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES FOR GROUPS
-- ============================================================================

-- Users can read groups they're members of
CREATE POLICY "Users can read own groups"
  ON groups FOR SELECT
  USING (
    id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- Group creators can update their groups
CREATE POLICY "Group creators can update"
  ON groups FOR UPDATE
  USING (created_by = auth.uid());

-- ============================================================================
-- RLS POLICIES FOR GROUP_MEMBERS
-- ============================================================================

-- Users can read group members of their groups
CREATE POLICY "Users can read group members"
  ON group_members FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- Users can join groups
CREATE POLICY "Users can join groups"
  ON group_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Group creators can remove members
CREATE POLICY "Admins can remove members"
  ON group_members FOR DELETE
  USING (
    group_id IN (
      SELECT id FROM groups WHERE created_by = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES FOR EVENTS
-- ============================================================================

-- Users can read events in their groups
CREATE POLICY "Users can read group events"
  ON events FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- Users can create events in their groups
CREATE POLICY "Users can create events in groups"
  ON events FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
    AND host_id = auth.uid()
  );

-- Event hosts can update their events
CREATE POLICY "Event hosts can update"
  ON events FOR UPDATE
  USING (host_id = auth.uid());

-- Event hosts can delete their events
CREATE POLICY "Event hosts can delete"
  ON events FOR DELETE
  USING (host_id = auth.uid());

-- ============================================================================
-- RLS POLICIES FOR RSVPS
-- ============================================================================

-- Users can read RSVPs for events in their groups
CREATE POLICY "Users can read event RSVPs"
  ON rsvps FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events
      WHERE group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
      )
    )
  );

-- Users can create/update their own RSVPs
CREATE POLICY "Users can RSVP"
  ON rsvps FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own RSVP"
  ON rsvps FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES FOR MESSAGES
-- ============================================================================

-- Users can read messages in their groups
CREATE POLICY "Users can read group messages"
  ON messages FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- Users can post messages in their groups
CREATE POLICY "Users can post messages"
  ON messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES FOR LOCATIONS
-- ============================================================================

-- Users can read locations for events they're in
CREATE POLICY "Users can read event locations"
  ON locations FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events
      WHERE group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
      )
    )
  );

-- Users can update their own locations
CREATE POLICY "Users can update own location"
  ON locations FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND event_id IN (
      SELECT id FROM events
      WHERE group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own location upd"
  ON locations FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's groups
CREATE OR REPLACE FUNCTION get_user_groups(p_user_id UUID)
RETURNS TABLE(id UUID, name TEXT, code TEXT, created_by UUID, created_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT g.id, g.name, g.code, g.created_by, g.created_at
  FROM groups g
  JOIN group_members gm ON g.id = gm.group_id
  WHERE gm.user_id = p_user_id
  ORDER BY g.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get group members count
CREATE OR REPLACE FUNCTION get_group_members_count(p_group_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) FROM group_members WHERE group_id = p_group_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get event RSVP summary
CREATE OR REPLACE FUNCTION get_event_rsvp_summary(p_event_id UUID)
RETURNS TABLE(yes_count INTEGER, no_count INTEGER, pending_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(CASE WHEN response = 'yes' THEN 1 END)::INTEGER as yes_count,
    COUNT(CASE WHEN response = 'no' THEN 1 END)::INTEGER as no_count,
    COUNT(CASE WHEN response IS NULL THEN 1 END)::INTEGER as pending_count
  FROM rsvps
  WHERE event_id = p_event_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE users IS 'User profiles and authentication data';
COMMENT ON TABLE groups IS 'Group/crew teams created by users';
COMMENT ON TABLE group_members IS 'Junction table: many-to-many relationship between users and groups';
COMMENT ON TABLE events IS 'Events created within groups with RSVP tracking';
COMMENT ON TABLE rsvps IS 'User responses to event invitations (yes, no, pending)';
COMMENT ON TABLE messages IS 'Group chat messages with real-time delivery';
COMMENT ON TABLE locations IS 'Live location tracking for event attendees';

COMMENT ON COLUMN users.avatar IS 'User initials (e.g., JD)';
COMMENT ON COLUMN users.color IS 'Hex color assigned to user for UI (e.g., #6C63FF)';
COMMENT ON COLUMN users.attended IS 'Count of events user has attended';
COMMENT ON COLUMN users.total IS 'Total count of events user was invited to';
COMMENT ON COLUMN users.streak IS 'Consecutive event attendance streak';

COMMENT ON COLUMN groups.code IS '4-digit numeric string for joining groups';

COMMENT ON COLUMN events.location_lat IS 'Latitude of event location (WGS84)';
COMMENT ON COLUMN events.location_lng IS 'Longitude of event location (WGS84)';
COMMENT ON COLUMN events.date IS 'Event date in YYYY-MM-DD format';
COMMENT ON COLUMN events.time IS 'Event time in HH:MM format (24-hour)';
COMMENT ON COLUMN events.datetime IS 'Unix timestamp (milliseconds) for sorting/filtering';
COMMENT ON COLUMN events.status IS 'Event lifecycle: upcoming or ended';

COMMENT ON COLUMN rsvps.response IS 'RSVP status: yes, no, or NULL (no response)';

COMMENT ON COLUMN locations.lat IS 'Latitude of user location (WGS84)';
COMMENT ON COLUMN locations.lng IS 'Longitude of user location (WGS84)';

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- After running this SQL:
-- 1. Enable "Realtime" in Supabase dashboard for each table
-- 2. Update app code to use Supabase client instead of Firebase
-- 3. Migrate data from Firestore using ETL process
-- 4. Test all queries and real-time subscriptions
-- 5. Update .env with SUPABASE_URL and SUPABASE_ANON_KEY
