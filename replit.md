# MOD CLUB - Cinema Community Platform

## Overview
A production-ready 18+ premium cinema community platform with user-created synchronized watch party rooms, live text chat, PWA support, multilingual (TR/EN), and a full Admin Panel. Built with Node.js + Express + PostgreSQL (Prisma) + React (Vite) + Tailwind CSS + Socket.io.

## Architecture
- **Backend**: Express.js + Socket.io at `index.js`
- **Database**: PostgreSQL via Prisma 7 ORM with `@prisma/adapter-pg`
- **Frontend**: React (Vite) + Tailwind CSS v3, built to `client/dist/`
- **Auth**: JWT-based with role-based access (Admin/Moderator/VIP/User)
- **Real-time**: Socket.io for live chat (global + room-level)
- **i18n**: react-i18next, Turkish default
- **PWA**: Service worker at `client/dist/sw.js` (cache v4), dynamic manifest at `/api/pwa/manifest`

## Project Structure
```
/
├── index.js              # Main Express + Socket.io server
├── server/
│   ├── db.js             # Prisma client with pg adapter
│   ├── seed.js           # Database seed script
│   ├── socket.js         # Socket.io handlers (global chat, rooms, XP, friends, DMs)
│   ├── middleware/
│   │   └── auth.js       # JWT auth middleware
│   └── routes/
│       ├── auth.js       # /api/auth/* (login, register, me - returns full user data)
│       ├── settings.js   # GET /api/settings
│       ├── public.js     # /api announcements, events, leaderboard
│       ├── rooms.js      # /api/rooms/* CRUD + join + messages + moderators + bans
│       ├── profile.js    # /api/profile/* (profile, XP, badges, frames, VIP, friends, DMs)
│       ├── admin.js      # /api/admin/* (protected, admin only)
│       └── pwa.js        # GET /api/pwa/manifest
├── client/src/
│   ├── App.jsx           # Routes: /, /rooms, /rooms/:id, /announcements, /leaderboard, /vip, /profile/:id, /login, /register, /admin/*
│   ├── context/
│   │   ├── AuthContext.jsx  # User auth state + updateUser()
│   │   └── SettingsContext.jsx
│   ├── components/
│   │   ├── Layout.jsx       # Global socket + XP tracking + notifications + real-time toast (new room/announcement/event)
│   │   ├── Navbar.jsx       # XP bar, notification bell, user avatar
│   │   ├── Sidebar.jsx      # Hidden for guests; shows XP bar, badges, nav links for users
│   │   ├── FloatingChat.jsx # Opens GlobalChatPanel
│   │   ├── GlobalChatPanel.jsx  # Real-time global chat with role colors, avatars
│   │   ├── UserAvatar.jsx   # Avatar with animated frame support
│   │   ├── UserProfileCard.jsx  # Profile card modal (click user in chat)
│   │   ├── XpBar.jsx        # XP progress bar component
│   │   ├── RoleBadge.jsx    # Username colors, role badges, badge list
│   │   ├── NotificationsPanel.jsx  # Friend requests + DM notifications
│   │   ├── LevelUpToast.jsx # Level up animation toast
│   │   ├── VideoPlayer.jsx
│   │   ├── HostControlsPanel.jsx
│   │   └── ...
│   └── pages/
│       ├── HomePage.jsx
│       ├── LandingPage.jsx
│       ├── ProfilePage.jsx       # User profile with bio, friends, DM chat
│       ├── RoomPage.jsx          # Room page with role-colored chat, profile cards
│       ├── RoomsPage.jsx         # /rooms — room browser with search, filter tabs
│       ├── AnnouncementsPage.jsx # /announcements — pinned + regular announcements
│       ├── LeaderboardPage.jsx   # /leaderboard — XP-ranked user list with podium
│       ├── VipPage.jsx           # /vip — VIP perks and Telegram contact
│       └── admin/
│           ├── AdminUsers.jsx  # Badge/XP/Level/VIP/Frame management
│           └── ...
```

## Key Features Implemented

### User System
- **Roles**: Admin (animated gold) > Moderator (blue) > VIP (animated purple) > User (gray)
- **XP/Level System**: 10 levels, XP per message, admin can give/set XP and levels
- **Avatars**: All users PNG/JPG; VIP/Mod/Admin can use GIFs
- **Profile Frames**: Admin-assignable animated frames (gold, fire, rainbow, galaxy, ice)
- **Badges**: Admin assigns emoji badges per user (⭐🏆🎬🔥💎🛡️🎭🌟👑🦊)
- **VIP**: Timed (N days) or permanent, auto-expiry check on login

### Real-time Chat
- **Global Chat**: Floating chat button on all pages → global real-time chat room
- **Room Chat**: Per-room chat with spam protection, mod controls
- **Chat Names**: Admin = bold+animated gold, VIP = animated purple, Mod = blue, User = gray
- **Profile pictures** shown in chat messages
- **Role icons** (⚙️/🛡️/💎) next to usernames
- **Badge list** shown next to username in chat
- **Profile Card**: Click any username in chat → profile modal with friend add + DM

### Friend System
- Send/accept/reject friend requests (socket events)
- Friends list on profile page
- Notification bell in navbar with count

### Private Messages (DM)
- Requires friendship (admin can DM anyone)
- Real-time via socket
- DM history loaded from API
- Notification bell shows unread count

### Admin Panel - Users
- Tabs: Temel (basic edit), Rozetler (badges), XP/Level, VIP, Çerçeve (frame)
- Set any user's XP, level, badges, frame, VIP (timed/permanent)

### Global Chat Moderation
- Admin/Mod can delete individual messages or clear entire global chat

### Profile Page (`/profile/:id`)
- View any user's profile, level, badges, bio
- Edit your own bio and avatar URL
- Friends list, DM chat window

## Watch Party Room System

### User-Created Rooms
- Any logged-in user can create 1 active room at a time (POST /api/rooms)
- Owner has host control automatically (claim_host on join)
- Rooms show "My Room" card at top of HomePage when owner has an active room
- Soft-delete frees the slot for a new room (DELETE /api/rooms/:id)

### Synchronized Playback
- YouTube: iframe API with play/pause, seek, 2s state sync to all viewers
- External: link-sharing mode with "Open in Platform" button
- Viewers receive real-time sync; drift > 3s auto-corrects
- Host disconnect pauses state and shows overlay to viewers

### Anti-Spam & Chat Controls
- Per-room configurable cooldown (1-30s, default 3s)
- Room owner/moderators are exempt from spam limits
- Host can toggle chat on/off and spam protection live
- Live cooldown indicator shown in chat input

### Password Protection
- isLocked + bcrypt-hashed password stored in DB
- /api/rooms/:id/join validates password before entering
- PasswordPrompt modal shown on locked room click

### Live Participant Counts
- In-memory roomParticipants map tracks connected sockets per room
- GET /api/rooms returns liveCount for each room
- GET /api/rooms/counts returns all counts as {roomId: count}
- RoomRow cards show green pulsing dot + real count (or gray 0)

### Provider Adapters
- youtube: YouTube iframe API with full host/viewer sync
- external: "Open in Platform" link display with optional URL change

## Admin Credentials
- Email: admin@yokoajans.com / Password: admin123

## Important Notes
- After schema changes: run `npx prisma db push && npx prisma generate`
- Build client: `cd client && npx vite build --outDir dist`
- Service worker cache: `yoko-ajans-v4` (auto-updates on deploy)
- Token stored as `yoko_token` in localStorage
