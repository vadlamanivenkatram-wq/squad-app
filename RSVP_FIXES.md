# RSVP Functionality - Bug Fixes & Implementation

## Issues Fixed

### 1. **Missing Real-Time Updates for Selected Event**
**Problem**: When viewing an event, other users' RSVP changes weren't reflected in real-time on the current viewer's screen.

**Solution**: Added a real-time listener for `selectedEvent`:
```javascript
useEffect(() => {
  if (!selectedEvent?.id) return;
  const unsub = onSnapshot(doc(db, "events", selectedEvent.id), snap => {
    if (snap.exists()) {
      const updatedEvent = { id: snap.id, ...snap.data() };
      setSelectedEvent(updatedEvent);
    }
  });
  return unsub;
}, [selectedEvent?.id]);
```
This subscribes to changes on the specific event document and updates the UI instantly when anyone RSVPs.

### 2. **"Change Mind" Button Parameter Error**
**Problem**: The "Change mind?" button was calling `onRsvp(null)` instead of `onRsvp(event.id, null)`.

**Solution**: Fixed both occurrences in EventScreen:
```javascript
// Before: onClick={() => onRsvp(null)}
// After: onClick={() => onRsvp(event.id, null)}
```
This ensures the button correctly clears the user's RSVP by passing both the event ID and null value.

### 3. **Improved RSVP Handler with Error Handling**
**Problem**: No error handling for RSVP updates; notifications sent even when RSVP was cleared.

**Solution**: Enhanced `handleRsvp` function:
```javascript
const handleRsvp = async (eventId, val) => {
  if (!eventId) return;
  try {
    const rsvpValue = val === null ? null : val;
    await updateDoc(doc(db, "events", eventId), { [`rsvps.${currentUser.id}`]: rsvpValue });
    
    const event = events.find(e => e.id === eventId) || selectedEvent;
    if (selectedEvent?.id === eventId) {
      setSelectedEvent(ev => ({ ...ev, rsvps: { ...ev.rsvps, [currentUser.id]: rsvpValue } }));
    }
    
    // Only notify when making a new commitment, not when clearing
    if (rsvpValue !== null) {
      await notifyRsvpUpdate(event, rsvpValue);
    }
  } catch (error) {
    console.error("RSVP error:", error);
  }
};
```

## How RSVP Now Works

### User Flow
1. **User clicks "Yes" or "No" button** on event details screen
2. **Button shows visual feedback** (color changes, disabled state)
3. **Firestore updates** with: `events/{eventId}/rsvps/{userId}: "yes"|"no"|null`
4. **Creator gets notified** via push notification (if not the responder)
5. **All viewers see update in real-time** via listener
6. **RSVP status changes display** with green/red colors and response counts

### Real-Time Updates
- When User A is viewing Event X
- User B clicks RSVP "Yes"
- User A's screen updates automatically (no refresh needed)
- They see User B appear in "Going" section
- They see count increase from "2 going" to "3 going"

### Visual Feedback
```
States shown in EventScreen:

[Pending]
- "You in tonight? 🎉" prompt with Yes/No buttons (amber border)

[After Yes]
- Green card: "✓ You're going! See you there."
- "Change mind?" link in muted color
- Shows all Going/NotGoing/Pending users with colored tags

[After No]
- Red card: "✗ You're not going"
- "Change mind?" link in muted color
- Shows all Going/NotGoing/Pending users with colored tags

[Host View]
- Always sees the summary of RSVPs
- Cannot RSVP to own events
- Can see live locations and end event
```

## Firestore Data Structure

### Event Document
```javascript
{
  id: "event123",
  title: "Dinner Night",
  groupId: "group1",
  hostId: "user1",
  rsvps: {
    "user2": "yes",      // User 2 is going
    "user3": "no",       // User 3 can't make it
    "user4": null,       // User 4 hasn't responded
    // Note: hostId is not in rsvps
  },
  status: "upcoming",
  createdAt: 1234567890,
  // ... other fields
}
```

## How Real-Time Updates Work

### Listener Architecture
```
Event Created:
├─ HomeScreen subscribes to all events in group
│  └─ Shows event list with "X going"
│
When User Clicks Event:
├─ Selected event shown in EventScreen
├─ New real-time listener created for that specific event
├─ Shows "Going / Not Going / Pending" lists
│
When Someone RSVPs (anywhere):
├─ Firestore detects update
├─ Both listeners fire:
│  ├─ HomeScreen listener: updates event in list
│  └─ EventScreen listener: updates event details
└─ UI re-renders instantly
```

## Notification System

### When Notifications Send
```javascript
await notifyRsvpUpdate(event, response);
// Sends to: event.hostId
// Only if: currentUser.id !== event.hostId && response !== null
```

### Notification Content
- **Title**: "RSVP update"
- **Body**: "{UserName} is going to {EventTitle}" or "{UserName} can't make it to {EventTitle}"
- **Recipient**: Event creator
- **Type**: "rsvp_update"

## Testing Checklist

- [ ] Click "Yes" button - state saves and shows green confirmation
- [ ] Click "No" button - state saves and shows red confirmation
- [ ] Click "Change mind?" - reverts to pending state
- [ ] Open event in another browser/device and RSVP - first device updates automatically
- [ ] Verify RSVP appears in "Going/Not Going/Pending" lists
- [ ] Event creator receives notification when someone RSVPs
- [ ] Cannot RSVP to own events
- [ ] Host can see all RSVP statuses
- [ ] Live locations show correct "Going" count
- [ ] Bill split uses correct attendee count

## Technical Details

### State Updates
- Local state: `setSelectedEvent()` updates immediately for UI feedback
- Firebase: `updateDoc()` saves to database
- Real-time sync: `onSnapshot()` listener keeps all viewers in sync

### Edge Cases Handled
1. User RSVPs while not on event screen - HomeScreen listener catches it
2. User changes RSVP multiple times - last value wins
3. User navigates away and back - listener cleans up and reattaches
4. Error during RSVP - logged to console, user can retry
5. Clearing RSVP (null) - doesn't send notification

## Files Modified
- `src/App.jsx`
  - Enhanced `handleRsvp` with error handling and conditional notifications
  - Added real-time listener for `selectedEvent` in useEffect
  - Fixed "Change mind?" button calls in EventScreen
