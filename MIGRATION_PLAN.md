# Firebase Firestore → Supabase Migration Plan

## Overview
Complete migration of Squad App data from Firebase Firestore to Supabase PostgreSQL database.

---

## Firestore Collections Analysis

### 1. **users** collection
**Current Firestore Structure:**
```
Document ID: user_id (auto-generated)
Fields:
  - name (string)
  - email (string, optional - for Google sign-in only)
  - username (string, optional - for manual signup)
  - password (string, optional - for manual signup)
  - avatar (string - initials like "JD")
  - color (string - hex color like "#6C63FF")
  - attended (number - count of events attended)
  - total (number - total events invited to)
  - streak (number - consecutive attendance streak)
  - joinedGroups (array - group IDs)
```

**Queries Used:**
- `where("email", "==", gUser.email)` - Google auth lookup
- `where("username", "==", username)` - Manual auth lookup
- Listen to all users filtered by groupData.members

---

### 2. **groups** collection
**Current Firestore Structure:**
```
Document ID: group_id (auto-generated)
Fields:
  - name (string)
  - code (string - 4-digit join code)
  - members (array - user IDs)
  - createdBy (string - user ID)
  - createdAt (number - timestamp)
```

**Queries Used:**
- `onSnapshot(collection(db, "groups"))` - Real-time group list
- `where("members", "array-contains", userId)` - Find user's groups
- `where("code", "==", code)` - Join group by code

**Subcollection:**
- `groups/{groupId}/messages` - See Messages table below

---

### 3. **events** collection
**Current Firestore Structure:**
```
Document ID: event_id (auto-generated)
Fields:
  - title (string)
  - type (string - "Hangout", "House Party", etc.)
  - location (object):
      - address (string)
      - lat (number, nullable)
      - lng (number, nullable)
  - date (string - ISO date "YYYY-MM-DD")
  - time (string - time "HH:MM")
  - datetime (number - epoch timestamp)
  - description (string)
  - hostId (string - user ID)
  - groupId (string - group ID)
  - rsvps (object - map of userId → "yes"|"no"|null):
      - userId: "yes" or "no" or null
  - status (string - "upcoming" or "ended")
  - createdAt (number - timestamp)
  - liveLocations (object - deprecated, should be ignored)
```

**Queries Used:**
- `addDoc(collection(db, "events"), ev)` - Create event
- `where("groupId", "==", currentGroup.id)` - Get events for group
- `onSnapshot(doc(db, "events", selectedEvent.id))` - Listen to single event
- `updateDoc(...rsvps)` - Update RSVP
- `deleteDoc(doc(db, "events", eventId))` - Delete event

**Subcollection:**
- `events/{eventId}/locations` - See Locations table below

---

### 4. **groups/{groupId}/messages** subcollection
**Current Firestore Structure:**
```
Parent: groups/{groupId}
Document ID: message_id (auto-generated)
Fields:
  - groupId (string)
  - text (string)
  - userId (string)
  - userName (string)
  - color (string - hex color)
  - createdAt (number - timestamp)
```

**Queries Used:**
- `onSnapshot(collection(db, "groups", groupId, "messages"), orderBy("createdAt", "asc"))` - Listen to group messages
- `addDoc(collection(db, "groups", groupId, "messages"), msg)` - Send message
- `getDocs(collection(db, "events", eventId, "messages"))` - Get event messages (for deletion only)

---

### 5. **events/{eventId}/locations** subcollection
**Current Firestore Structure:**
```
Parent: events/{eventId}
Document ID: user_id (the user sharing location)
Fields:
  - userId (string)
  - name (string - user name)
  - avatar (string - user initials)
  - color (string - hex color)
  - lat (number)
  - lng (number)
  - updatedAt (number - timestamp)
```

**Queries Used:**
- `onSnapshot(collection(db, "events", event.id, "locations"))` - Real-time location tracking
- `setDoc(doc(db, "events", event.id, "locations", user.id), locData)` - Update user's location

---

## Supabase Tables Required

### Table 1: `users`
```sql
CREATE TABLE users (
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

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

**Relationships:**
- users.id ← group_members.user_id
- users.id ← events.host_id
- users.id ← rsvps.user_id
- users.id ← messages.user_id
- users.id ← locations.user_id

---

### Table 2: `groups`
```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_groups_code ON groups(code);
CREATE INDEX idx_groups_created_by ON groups(created_by);
```

**Note:** Members are in `group_members` junction table (see below)

---

### Table 3: `group_members` (junction table)
```sql
CREATE TABLE group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX idx_group_members_user_id ON group_members(user_id);
```

**Purpose:** Replace Firestore `groups.members` array

---

### Table 4: `events`
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  location_address TEXT,
  location_lat NUMERIC(10, 8),
  location_lng NUMERIC(11, 8),
  date TEXT, -- "YYYY-MM-DD"
  time TEXT, -- "HH:MM"
  datetime BIGINT, -- epoch milliseconds
  description TEXT,
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'upcoming', -- 'upcoming' or 'ended'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_group_id ON events(group_id);
CREATE INDEX idx_events_host_id ON events(host_id);
CREATE INDEX idx_events_status ON events(status);
```

**Note:** RSVPs are in `rsvps` table (see below)

---

### Table 5: `rsvps`
```sql
CREATE TABLE rsvps (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response TEXT, -- 'yes', 'no', or NULL for no response
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX idx_rsvps_user_id ON rsvps(user_id);
```

**Purpose:** Replace Firestore `events.rsvps` object

---

### Table 6: `messages`
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_group_id ON messages(group_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_user_id ON messages(user_id);
```

**Purpose:** Replace Firestore `groups/{groupId}/messages` subcollection

---

### Table 7: `locations`
```sql
CREATE TABLE locations (
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

CREATE INDEX idx_locations_event_id ON locations(event_id);
CREATE INDEX idx_locations_user_id ON locations(user_id);
CREATE INDEX idx_locations_updated_at ON locations(updated_at);
```

**Purpose:** Replace Firestore `events/{eventId}/locations` subcollection

---

## Data Type Mappings

| Firestore | Supabase | Notes |
|-----------|----------|-------|
| Document ID (auto) | UUID | Use `gen_random_uuid()` |
| string | TEXT | Standard text field |
| number | INTEGER or NUMERIC | Floats use NUMERIC(precision, scale) |
| boolean | BOOLEAN | N/A (not used in this app) |
| array | TABLE (junction) | Create separate junction tables |
| object | Separate columns | Flatten nested objects into columns |
| timestamp (ms) | TIMESTAMPTZ | Convert: `to_timestamp(ms_value/1000)` |
| null | NULL | Same behavior |

---

## Migration Strategy

### Phase 1: Schema Creation
1. Create all 7 tables in Supabase
2. Enable Row Level Security (RLS) policies
3. Create indexes for performance

### Phase 2: Data Migration
1. Export Firestore data as JSON
2. Transform data:
   - Replace array fields with junction tables
   - Flatten nested objects (location)
   - Convert timestamps (ms → postgres timestamp)
   - Generate UUIDs for document IDs
3. Import via PostgreSQL COPY or Supabase Data Import UI
4. Verify data integrity

### Phase 3: Code Updates
1. Replace Firebase SDK imports with Supabase client
2. Update all collection queries → SQL queries
3. Replace `onSnapshot` with Supabase real-time subscriptions
4. Update CRUD operations (addDoc, updateDoc, etc.)
5. Update local storage references

### Phase 4: Testing
1. Test all queries in development
2. Test real-time listeners
3. Test auth flow (Google & manual)
4. Performance testing on similar data

---

## Implementation Priority

### High Priority (Core Features)
- [ ] users table + auth
- [ ] groups table + group_members
- [ ] events table + rsvps
- [ ] messages table

### Medium Priority (Real-time)
- [ ] Implement Supabase real-time listeners
- [ ] locations table + live updates

### Low Priority (Optimization)
- [ ] RLS policies
- [ ] Performance tuning
- [ ] Index optimization

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Data loss during migration | Critical | Backup Firestore before migration, test with sample data first |
| Downtime during cutover | High | Dual-write strategy: write to both FB & Supabase during transition |
| Query performance degradation | Medium | Profile queries, create proper indexes, use connection pooling |
| Real-time listeners breaking | High | Test all listeners before full cutover, keep fallback |
| Auth disruption | Critical | Test Google OAuth & manual auth separately before cutover |

---

## Rollback Plan

If issues occur post-migration:
1. Keep Firestore data intact for 30 days
2. Switch app back to Firebase imports
3. Investigate and fix issues
4. Retry migration

---

## Timeline Estimate

- **Schema & Setup:** 2-4 hours
- **Data Migration:** 2-3 hours
- **Code Refactoring:** 4-6 hours
- **Testing:** 4-6 hours
- **Total:** 12-19 hours (~1-2 developer days)

---

## Notes

- Google OAuth will continue using Supabase auth (already configured)
- Push notifications via Supabase functions should remain compatible
- Local storage references (localGroup, localUser) can stay the same
- Consider migrating to Supabase auth for password-based signups too
