# Squad App — Claude Context

## Project Overview
A social group app called "Squad" where friends can plan events, track RSVPs, split bills, see live locations, and view rankings.

Live at: https://thecircle-seven.vercel.app

## Tech Stack
- React + Vite (single page app)
- Firebase Firestore — real-time database
- Supabase — Google OAuth authentication
- Vercel — deployment (auto-deploys on git push to master)

## Key Files
- `src/App.jsx` — entire app lives here (all screens in one file, ~940+ lines)
- `src/firebase.js` — initializes Firebase, exports `db`
- `src/supabase.js` — initializes Supabase client for Google auth
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
git push                           # triggers Vercel auto-deploy
```

## Architecture Notes
- All screens are functions inside `src/App.jsx` (LoginScreen, GroupSelectScreen, HomeScreen, etc.)
- `db` is exported from `./firebase` and must be imported at the top of App.jsx
- Supabase is used ONLY for Google auth — all data is stored in Firebase Firestore
- Firebase auth is NOT used — only Supabase auth for Google sign-in

## Auth Flow
1. User clicks "Continue with Google"
2. Supabase `signInWithOAuth({ provider: 'google' })` redirects to Google
3. Google redirects back to `https://thecircle-seven.vercel.app`
4. `onAuthStateChange` listener in LoginScreen catches the session
5. `checkGoogleAuth()` looks up or creates the user in Firestore
6. `onLogin(user)` is called to set the current user in app state

## Important Fixes Already Applied
- `db` must be imported: `import { db } from "./firebase"` at top of App.jsx
- Supabase Site URL and Redirect URL must be `https://thecircle-seven.vercel.app`
- `handleLogout` must call `await supabase.auth.signOut()` to clear session
- `onAuthStateChange` listener must be set up in LoginScreen useEffect

## Supabase Config
- Project URL: https://cgyazwnwrhegiqubdiso.supabase.co
- Redirect URL configured: https://thecircle-seven.vercel.app
- Google provider: enabled

## Firebase Config
- Project ID: thecircle-c5b2a
- Auth domain: thecircle-c5b2a.firebaseapp.com

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
