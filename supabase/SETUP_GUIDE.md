# Supabase Schema Setup Guide

## Quick Start

### 1. In Supabase Dashboard

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **SQL Editor** (left sidebar)
3. Click **+ New Query**
4. Copy the entire contents of `supabase/migrations/001_create_schema.sql`
5. Paste into the SQL editor
6. Click **Run** (or Cmd/Ctrl + Enter)
7. Wait for completion (~30 seconds)

### 2. Verify Tables Created

1. Go to **Table Editor** (left sidebar)
2. You should see 7 new tables:
   - users
   - groups
   - group_members
   - events
   - rsvps
   - messages
   - locations

3. Click into each table to verify structure

### 3. Enable Real-time

The SQL script includes `ALTER PUBLICATION supabase_realtime ADD TABLE ...` for all tables, which enables real-time updates. However, you can also manually enable it:

1. Go to **Database** → **Replication** (left sidebar)
2. Under "Publication: supabase_realtime", verify all 7 tables are enabled:
   - ✓ users
   - ✓ groups
   - ✓ group_members
   - ✓ events
   - ✓ rsvps
   - ✓ messages
   - ✓ locations

If any are missing, toggle them ON.

### 4. Test with Verification Queries

1. Go back to **SQL Editor**
2. Click **+ New Query**
3. Copy queries from `supabase/verification_queries.sql`
4. Run each query to verify data integrity
5. Example: `SELECT * FROM users;` should show any existing users

---

## Schema Summary

### 7 Core Tables

| Table | Purpose | Real-time? | Rows |
|-------|---------|-----------|------|
| users | User profiles & auth | ✓ | N/A |
| groups | Crew teams | ✓ | N/A |
| group_members | Group membership | ✓ | N/A |
| events | Events with location | ✓ | N/A |
| rsvps | Event responses | ✓ | N/A |
| messages | Group chat | ✓ | N/A |
| locations | Live location tracking | ✓ | N/A |

### Key Relationships

```
users ──── group_members ──── groups
  │                             │
  │                             └─── events
  │                                    │
  │                                    ├─── rsvps
  │                                    └─── locations
  │
  └─── messages ──── groups
```

### Indexes Created

All tables have strategic indexes for fast queries:

**users:**
- idx_users_email
- idx_users_username

**groups:**
- idx_groups_code
- idx_groups_created_by

**events:**
- idx_events_group_id
- idx_events_host_id
- idx_events_status
- idx_events_datetime

**messages:**
- idx_messages_group_id
- idx_messages_created_at
- idx_messages_user_id
- idx_messages_group_created (composite)

**locations:**
- idx_locations_event_id
- idx_locations_user_id
- idx_locations_updated_at

---

## Row Level Security (RLS) Policies

All tables have RLS enabled with policies that enforce:

- **Users** can only read/modify their own profile
- **Users** can see other members in shared groups
- **Users** can read/create messages in their groups
- **Users** can create RSVPs but only update their own
- **Event hosts** can update/delete their events
- **Users** can share locations only for groups they're in

### Important: Auth Configuration

The RLS policies reference `auth.uid()`. This works automatically with:
- **Supabase Auth** (Google OAuth)
- **Service Role Key** (backend operations)

For manual testing, you'll need to:
1. Log in via Google OAuth first
2. Or use the **Service Role Key** in Supabase client with `{ global: { headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` } } }`

---

## Helper Functions

The schema includes 3 PL/pgSQL functions:

### 1. get_user_groups(p_user_id UUID)
Returns all groups a user belongs to.
```sql
SELECT * FROM get_user_groups('{user_id}');
```

### 2. get_group_members_count(p_group_id UUID)
Returns member count for a group.
```sql
SELECT get_group_members_count('{group_id}');
```

### 3. get_event_rsvp_summary(p_event_id UUID)
Returns RSVP counts (yes, no, pending) for an event.
```sql
SELECT * FROM get_event_rsvp_summary('{event_id}');
```

---

## Migration Checklist

- [ ] Run `001_create_schema.sql` in Supabase SQL Editor
- [ ] Verify 7 tables appear in Table Editor
- [ ] Confirm all real-time tables are enabled
- [ ] Run verification queries successfully
- [ ] Test sample data insertion
- [ ] Configure RLS policies (already done in SQL)
- [ ] Set up environment variables in `.env.local`:
  ```
  VITE_SUPABASE_URL=https://xxxxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJ...
  ```
- [ ] Update App.jsx to use Supabase client
- [ ] Test authentication flow
- [ ] Migrate Firestore data to Supabase
- [ ] Test all app features
- [ ] Enable monitoring/logging

---

## Troubleshooting

### Error: "relation already exists"
The SQL uses `IF NOT EXISTS` to handle re-runs. If you get this error:
1. Drop the tables manually or in a new project
2. Re-run the schema

### Error: "permission denied"
Ensure you're using a **Service Role Key** or logged-in user with proper auth context.

### Real-time not working
1. Go to **Database** → **Replication**
2. Toggle the table OFF then ON
3. Wait 10 seconds and refresh the page

### Indexes not performing
Run this to analyze table statistics:
```sql
ANALYZE users;
ANALYZE groups;
ANALYZE events;
-- etc
```

---

## Next Steps

1. **Data Migration**: Export Firestore → PostgreSQL
2. **Code Updates**: Replace Firebase SDK with Supabase
3. **Testing**: Verify all queries and real-time subscriptions
4. **Deployment**: Update production environment

---

## Useful Commands

### Check table sizes
```sql
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname = 'public';
```

### Check row counts
```sql
SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'groups', COUNT(*) FROM groups
UNION ALL SELECT 'events', COUNT(*) FROM events;
```

### Drop all tables (for fresh start)
```sql
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS rsvps CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

### Backup data before migration
```sql
-- Create backup of entire schema
pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres -t 'public.*' > backup.sql
```

---

## Support

For issues:
1. Check Supabase logs: **Logs** → **API Logs** or **Database Logs**
2. Verify policy syntax in **SQL Editor**
3. Test queries directly in **SQL Editor**
4. Check Supabase status: https://status.supabase.com
