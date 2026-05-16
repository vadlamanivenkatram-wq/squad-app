# Squad App — Claude Context

## Project Overview
A social group app called "Squad" where friends can plan events, track RSVPs, split bills, see live locations, and view rankings.

Live at: https://squad-app.vadlamanivenkatram.workers.dev

## Tech Stack
- React + Vite (single page app)
- Supabase PostgreSQL — primary database with real-time channels
- Supabase Auth — Google OAuth and manual username/password auth
- Cloudflare Workers & Pages — deployment (manual deploy via Wrangler or dashboard)

## Key Files
- `src/App.jsx` — entire app lives here (all screens in one file, ~940+ lines)
- `src/supabase.js` — initializes Supabase client and exports `supabase`
- `supabase/migrations/001_create_schema.sql` — Supabase schema for users, groups, events, rsvps, messages, locations
- `supabase/QUERY_REFERENCE.js` — Firebase→Supabase query migration guide
- `src/App.css` — global styles

## Environment
- OS: Windows (use PowerShell commands, NOT bash/sed/linux commands)
- Use `Get-Content src/App.jsx | Select-Object -Index (N..M)` to read specific lines
- Package manager: npm
- Git branch: master

## Common Commands
```powershell
npm run dev                        # local dev server
npm run build                      # production build (run to check for errors before pushing)
git add .
git commit -m "message"
git push                           # push to git (manual deploy required for Cloudflare)
```

## Architecture Notes
- All screens are functions inside `src/App.jsx` (LoginScreen, GroupSelectScreen, HomeScreen, etc.)
- Supabase client is imported from `./supabase` and used for all database and auth operations
- Supabase tables replace Firestore collections and subcollections with relational tables and junction tables
- Real-time app behavior is now handled by Supabase Realtime channels on `groups`, `events`, `messages`, and `locations`
- Supabase Auth manages user sessions and Google sign-in

## Auth Flow
1. User clicks "Continue with Google"
2. Supabase `signInWithOAuth({ provider: 'google' })` redirects to Google
3. Google redirects back to `https://squad-app.vadlamanivenkatram.workers.dev`
4. `onAuthStateChange` listener in LoginScreen catches the session
5. `checkGoogleAuth()` looks up or creates the user in Supabase `users`
6. `onLogin(user)` is called to set the current user in app state

## Important Fixes Already Applied
- Supabase Site URL and Redirect URL must be `https://squad-app.vadlamanivenkatram.workers.dev`
- `handleLogout` must call `await supabase.auth.signOut()` to clear session
- `onAuthStateChange` listener must be set up in LoginScreen useEffect
- Firebase imports and Firestore SDK calls were removed from `src/App.jsx`
- Database writes now use Supabase inserts/updates and real-time subscriptions use Supabase channels

## Supabase Config
- Project URL: https://cgyazwnwrhegiqubdiso.supabase.co
- Redirect URL configured: https://squad-app.vadlamanivenkatram.workers.dev
- Google provider: enabled

## Features
- Welcome/landing page
- Login & Signup with username & password
- Google sign-in via Supabase
- Groups with 4-digit join codes
- Events & RSVPs
- Bill splitting
- Rankings
- Live location map

## Known Issues / In Progress
- Join code input boxes (4 separate inputs) — size was being adjusted
- Build error in App.jsx around line 408 needs to be fixed (missing closing tags in join view)
