// Supabase Client Setup & Query Reference
// Use this to migrate from Firebase to Supabase in App.jsx

// ============================================================================
// 1. ENVIRONMENT SETUP (.env.local)
// ============================================================================

// .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// ============================================================================
// 2. CLIENT INITIALIZATION (replaces firebase.js)
// ============================================================================

// supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================================
// 3. QUERY EQUIVALENTS - USERS
// ============================================================================

// Firebase: getDocs(query(collection(db, "users"), where("email", "==", email)))
// Supabase:
const { data: users, error } = await supabase
  .from('users')
  .select('*')
  .eq('email', email);
const user = users?.[0] || null;

// Firebase: getDocs(query(collection(db, "users"), where("username", "==", username)))
// Supabase:
const { data: users, error } = await supabase
  .from('users')
  .select('*')
  .eq('username', username.toLowerCase());
const user = users?.[0] || null;

// Firebase: addDoc(collection(db, "users"), userData)
// Supabase:
const { data, error } = await supabase
  .from('users')
  .insert([{ name, email, avatar, color, attended: 0, total: 0, streak: 0 }])
  .select();
const newUserId = data?.[0]?.id;

// Firebase: updateDoc(doc(db, "users", userId), { joinedGroups: arrayUnion(groupId) })
// Supabase: Use array column or junction table. With group_members junction:
const { error } = await supabase
  .from('group_members')
  .insert([{ group_id: groupId, user_id: userId }]);

// Firebase: onSnapshot(collection(db, "users"), snap => ...)
// Supabase:
const subscription = supabase
  .from('users')
  .on('*', payload => {
    console.log('User change:', payload);
  })
  .subscribe();
// Clean up: subscription.unsubscribe()

// ============================================================================
// 4. QUERY EQUIVALENTS - GROUPS
// ============================================================================

// Firebase: onSnapshot(collection(db, "groups"), snap => ...)
// Supabase:
const subscription = supabase
  .from('groups')
  .on('*', payload => {
    console.log('Group change:', payload);
  })
  .subscribe();

// Firebase: addDoc(collection(db, "groups"), { name, code, members: [userId], createdBy: userId, ... })
// Supabase:
const { data, error } = await supabase
  .from('groups')
  .insert([{ name, code, created_by: userId }])
  .select();
const groupId = data?.[0]?.id;
// Then add user to group_members:
await supabase
  .from('group_members')
  .insert([{ group_id: groupId, user_id: userId }]);

// Firebase: query(collection(db, "groups"), where("members", "array-contains", userId))
// Supabase:
const { data: groups, error } = await supabase
  .from('group_members')
  .select('groups(*)')
  .eq('user_id', userId);
const userGroups = groups.map(gm => gm.groups);

// Firebase: query(collection(db, "groups"), where("code", "==", code))
// Supabase:
const { data: groups, error } = await supabase
  .from('groups')
  .select('*')
  .eq('code', code);
const group = groups?.[0] || null;

// Firebase: updateDoc(doc(db, "groups", groupId), { members: [...members, userId] })
// Supabase:
const { error } = await supabase
  .from('group_members')
  .insert([{ group_id: groupId, user_id: userId }]);

// ============================================================================
// 5. QUERY EQUIVALENTS - EVENTS
// ============================================================================

// Firebase: addDoc(collection(db, "events"), eventData)
// Supabase:
const { data, error } = await supabase
  .from('events')
  .insert([{
    title,
    type,
    location_address: location.address,
    location_lat: location.lat,
    location_lng: location.lng,
    date,
    time,
    datetime,
    description,
    host_id: userId,
    group_id: groupId,
    status: 'upcoming',
  }])
  .select();
const eventId = data?.[0]?.id;

// Firebase: query(collection(db, "events"), where("groupId", "==", groupId))
// Supabase:
const { data: events, error } = await supabase
  .from('events')
  .select('*')
  .eq('group_id', groupId)
  .eq('status', 'upcoming')
  .order('datetime', { ascending: true });

// Firebase: onSnapshot(doc(db, "events", eventId), snap => ...)
// Supabase:
const subscription = supabase
  .from('events')
  .on('UPDATE', payload => {
    if (payload.new.id === eventId) {
      console.log('Event updated:', payload.new);
    }
  })
  .subscribe();

// Firebase: updateDoc(doc(db, "events", eventId), { [`rsvps.${userId}`]: response })
// Supabase: Use rsvps table
const { error } = await supabase
  .from('rsvps')
  .upsert([{ event_id: eventId, user_id: userId, response }]);

// Firebase: deleteDoc(doc(db, "events", eventId))
// Supabase:
const { error } = await supabase
  .from('events')
  .delete()
  .eq('id', eventId);
// Deletes will cascade to rsvps, messages, locations automatically

// ============================================================================
// 6. QUERY EQUIVALENTS - RSVPS
// ============================================================================

// Firebase: event.rsvps[userId]
// Supabase:
const { data: rsvps, error } = await supabase
  .from('rsvps')
  .select('*')
  .eq('event_id', eventId)
  .eq('user_id', userId);
const userRsvp = rsvps?.[0]?.response || null;

// Firebase: Listen to event RSVPs for real-time updates
// Supabase:
const subscription = supabase
  .from('rsvps')
  .on('*', payload => {
    if (payload.new.event_id === eventId) {
      console.log('RSVP updated:', payload.new);
    }
  })
  .subscribe();

// Get RSVP summary for event
const { data: rsvpData, error } = await supabase
  .rpc('get_event_rsvp_summary', { p_event_id: eventId });
// Returns: { yes_count, no_count, pending_count }

// ============================================================================
// 7. QUERY EQUIVALENTS - MESSAGES
// ============================================================================

// Firebase: onSnapshot(query(collection(db, "groups", groupId, "messages"), orderBy("createdAt", "asc")), snap => ...)
// Supabase:
const subscription = supabase
  .from('messages')
  .on('INSERT', payload => {
    if (payload.new.group_id === groupId) {
      console.log('New message:', payload.new);
    }
  })
  .subscribe();
// Also query historical messages:
const { data: messages, error } = await supabase
  .from('messages')
  .select('*')
  .eq('group_id', groupId)
  .order('created_at', { ascending: true });

// Firebase: addDoc(collection(db, "groups", groupId, "messages"), messageData)
// Supabase:
const { data, error } = await supabase
  .from('messages')
  .insert([{
    group_id: groupId,
    text: messageText,
    user_id: userId,
    user_name: userName,
    user_color: userColor,
  }])
  .select();

// ============================================================================
// 8. QUERY EQUIVALENTS - LOCATIONS
// ============================================================================

// Firebase: onSnapshot(collection(db, "events", eventId, "locations"), snap => ...)
// Supabase:
const subscription = supabase
  .from('locations')
  .on('*', payload => {
    if (payload.new?.event_id === eventId || payload.old?.event_id === eventId) {
      console.log('Location update:', payload);
    }
  })
  .subscribe();
// Also query current locations:
const { data: locations, error } = await supabase
  .from('locations')
  .select('*')
  .eq('event_id', eventId);

// Firebase: setDoc(doc(db, "events", eventId, "locations", userId), locationData)
// Supabase: Use upsert (insert or update)
const { error } = await supabase
  .from('locations')
  .upsert([{
    event_id: eventId,
    user_id: userId,
    user_name: name,
    user_avatar: avatar,
    user_color: color,
    lat: latitude,
    lng: longitude,
  }], {
    onConflict: 'event_id,user_id',
  });

// ============================================================================
// 9. HELPER FUNCTIONS - COMPLEX QUERIES
// ============================================================================

// Get user's dashboard (groups, events, messages)
async function getUserDashboard(userId) {
  // Get user's groups
  const { data: groupData } = await supabase
    .from('group_members')
    .select('groups(id, name, code)')
    .eq('user_id', userId);
  
  const groups = groupData.map(gm => gm.groups);
  
  // Get events for each group
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .in('group_id', groups.map(g => g.id))
    .eq('status', 'upcoming')
    .order('datetime', { ascending: true });
  
  return { groups, events };
}

// Get attendee list for an event
async function getEventAttendees(eventId) {
  const { data: rsvps } = await supabase
    .from('rsvps')
    .select('users(id, name, avatar, color)')
    .eq('event_id', eventId)
    .eq('response', 'yes');
  
  return rsvps.map(r => r.users);
}

// Get user statistics
async function getUserStats(userId) {
  const { data: user } = await supabase
    .from('users')
    .select('attended, total, streak')
    .eq('id', userId);
  
  return user?.[0] || { attended: 0, total: 0, streak: 0 };
}

// ============================================================================
// 10. REALTIME SUBSCRIPTIONS - BEST PRACTICES
// ============================================================================

// Example: Listen to messages in real-time with automatic scrolling
function subscribeToGroupMessages(groupId, onNewMessage) {
  return supabase
    .from('messages')
    .on('INSERT', payload => {
      if (payload.new.group_id === groupId) {
        onNewMessage(payload.new);
      }
    })
    .subscribe();
}

// Cleanup function for unsubscribing
function unsubscribeFromMessages(subscription) {
  return supabase.removeSubscription(subscription);
}

// Example: Multiple subscriptions with cleanup
useEffect(() => {
  const subscriptions = [];
  
  const msgSub = supabase
    .from('messages')
    .on('*', payload => handleMessageChange(payload))
    .subscribe();
  subscriptions.push(msgSub);
  
  const locSub = supabase
    .from('locations')
    .on('*', payload => handleLocationChange(payload))
    .subscribe();
  subscriptions.push(locSub);
  
  return () => {
    subscriptions.forEach(sub => supabase.removeSubscription(sub));
  };
}, []);

// ============================================================================
// 11. ERROR HANDLING
// ============================================================================

// Always check for errors
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId);

if (error) {
  console.error('Query error:', error.message);
  // Handle error: show notification, retry, etc
} else {
  console.log('Data:', data);
}

// ============================================================================
// 12. AUTHENTICATION WITH SUPABASE
// ============================================================================

// Already configured in supabase.js for Google OAuth
// For manual email/password auth:

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: userEmail,
  password: userPassword,
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: userEmail,
  password: userPassword,
});

// Sign out
await supabase.auth.signOut();

// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Listen to auth changes
const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event);
  if (session?.user) {
    // User logged in
    initializeApp(session.user);
  } else {
    // User logged out
    resetApp();
  }
});

return () => subscription?.unsubscribe();

// ============================================================================
// 13. MIGRATION CHECKLIST FOR APP.JSX
// ============================================================================

/*
- [ ] Replace Firebase import: import { db } from './firebase' → import { supabase } from './supabase'
- [ ] Update all collection() calls to supabase.from().select()
- [ ] Update all addDoc() to supabase.from().insert()
- [ ] Update all updateDoc() to supabase.from().update()
- [ ] Update all deleteDoc() to supabase.from().delete()
- [ ] Update all getDocs() to supabase.from().select()
- [ ] Update all onSnapshot() to supabase.from().on()
- [ ] Replace Firebase where() with .eq(), .neq(), .in(), .gt() etc
- [ ] Replace Firebase orderBy() with .order()
- [ ] Update array field operations (arrayUnion) to use junction tables
- [ ] Update nested object fields to use separate columns
- [ ] Test all queries
- [ ] Test real-time subscriptions
- [ ] Test authentication flow
*/
