# Multi-Group Support Implementation

## Overview
Updated the Squad app to support users joining multiple groups. Previously, each user could only be in one group. Now they can join multiple groups and switch between them.

## Key Changes Made

### 1. **User Data Model Update**
- Added `joinedGroups: []` field to new user creation (both signup and Google auth)
- This array stores the IDs of all groups the user has joined
- Stored in Firestore under each user document

### 2. **Group Join/Create Logic**
- **HandleJoin** (GroupSelectScreen):
  - Now updates user's `joinedGroups` array in Firestore using `arrayUnion`
  - Ensures the group ID is added to the user's joined groups
  
- **HandleCreate** (GroupSelectScreen):
  - Now updates user's `joinedGroups` array when creating a new group
  - The creator is automatically added to their own group's joinedGroups

### 3. **Home Screen Updates**
- Added **Group Dropdown Selector** at the top:
  - Shows all groups the user has joined
  - Clicking a group switches to that group
  - Uses the `joinedGroups` state to populate options
  
- Added **"Join with code" button**:
  - Appears next to the dropdown
  - Clicking it takes user back to GroupSelectScreen
  - User can join additional groups while keeping their current group state

- Added **RSVP support**:
  - Added `onRsvp` prop to HomeScreen to handle event responses
  - Fixed pending event invite functionality

### 4. **App State Management**
- **New State Variable**: `joinedGroups`
  - Loads on app init using `loadJoinedGroups()`
  - Queries Firestore for all groups where user is a member
  - Updated whenever user joins a new group

- **Initialize User Groups** (useEffect):
  - Automatically loads all joined groups when user logs in
  - Selects first group if no current group is set
  - Handles initial group selection on app load

### 5. **Group Selection Flow**
- When user is logged in and has joined groups:
  - HomeScreen displays with group dropdown
  - User can switch between groups using dropdown
  - User can join more groups using "Join with code" button
  
- When user has no groups:
  - GroupSelectScreen shows (existing flow)
  - User can create or join their first group
  - After first group, app shows HomeScreen with multi-group UI

## Firestore Schema

### Users Collection
```javascript
{
  id: "user123",
  name: "John Doe",
  email: "john@example.com",
  avatar: "JD",
  color: "#6C63FF",
  attended: 5,
  total: 8,
  streak: 2,
  joinedGroups: ["group1", "group2", "group3"]  // NEW
}
```

### Groups Collection
```javascript
{
  id: "group1",
  name: "The Boys",
  code: "1234",
  members: ["user1", "user2", "user3"],
  createdBy: "user1",
  createdAt: 1234567890
}
```

### Events Collection
```javascript
{
  id: "event1",
  title: "Dinner night",
  groupId: "group1",      // Events are scoped to groups
  hostId: "user1",
  // ... other fields
}
```

## User Flows

### Joining a New Group While in Another Group
1. User on HomeScreen in "group1"
2. Clicks "Join with code" button
3. GroupSelectScreen appears
4. User sees all their existing groups listed
5. User enters code for "group2"
6. System adds "group2" to user's joinedGroups array
7. User is switched to "group2"
8. HomeScreen refreshes with "group2" data
9. Dropdown now shows both "group1" and "group2"

### Switching Between Groups
1. User on HomeScreen
2. Clicks group dropdown
3. Selects different group from list
4. HomeScreen refreshes with selected group's data
5. Events, messages, and members update for new group

### Creating a New Group
1. User clicks "Join with code" then "Create group"
2. Enters group name
3. System generates code
4. User clicks "Create & enter group"
5. New group is added to user's joinedGroups
6. HomeScreen shows new group

## Benefits

1. **Multi-Group Support**: Users can be members of multiple squads/crews
2. **Easy Switching**: Dropdown makes it simple to switch between groups
3. **Group Isolation**: Events, messages, and members are scoped per group
4. **Scalability**: Users can manage multiple groups without losing data
5. **Backward Compatibility**: Existing single-group data still works

## Technical Details

### Firebase Operations
- **arrayUnion**: Used to add group IDs to user's joinedGroups (prevents duplicates)
- **Query with array-contains**: Used to find all groups user is a member of
- **Real-time listeners**: Subscriptions to group data update instantly when groups change

### State Management
- `currentGroup`: Currently selected group (used for HomeScreen/GroupSelectScreen logic)
- `joinedGroups`: All groups user has joined (used for dropdown)
- `groupData`: Full group data with members (used for subscriptions)

## Testing Checklist

- [ ] New user signup creates with empty joinedGroups array
- [ ] Joining first group works and takes user to HomeScreen
- [ ] Group dropdown shows all joined groups
- [ ] Clicking dropdown option switches to that group
- [ ] "Join with code" button works to join additional groups
- [ ] New group appears in dropdown after joining
- [ ] Events are properly scoped to groups
- [ ] Messages are properly scoped to groups
- [ ] User rankings work across all groups
- [ ] Logging out and logging back in preserves group list

## File Changes
- `src/App.jsx`: All changes consolidated in this file
  - LoginScreen: Added joinedGroups to new users
  - GroupSelectScreen: Updated join/create to save to joinedGroups
  - HomeScreen: Added dropdown selector and improved layout
  - App (main): Added multi-group state management and initialization logic
