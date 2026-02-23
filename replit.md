# YOKO AJANS - Cinema Community Platform

## Overview
A production-ready 18+ cinema community platform with watch parties, live text chat, PWA support, multilingual (TR/EN), and a full Admin Panel. Built with Node.js + Express + PostgreSQL (Prisma) + React (Vite) + Tailwind CSS + Socket.io.

## Architecture
- **Backend**: Express.js + Socket.io at `index.js`
- **Database**: PostgreSQL via Prisma 7 ORM with `@prisma/adapter-pg`
- **Frontend**: React (Vite) + Tailwind CSS v3, built to `client/dist/`
- **Auth**: JWT-based with role-based access (Admin/VIP/User)
- **Real-time**: Socket.io for live chat
- **i18n**: react-i18next, Turkish default
- **PWA**: Service worker at `client/dist/sw.js`, dynamic manifest at `/api/pwa/manifest`

## Project Structure
```
/
├── index.js              # Main Express + Socket.io server
├── server/
│   ├── db.js             # Prisma client with pg adapter
│   ├── seed.js           # Database seed script
│   ├── socket.js         # Socket.io handlers
│   ├── middleware/
│   │   └── auth.js       # JWT auth middleware
│   └── routes/
│       ├── auth.js       # /api/auth/* (login, register, me)
│       ├── settings.js   # GET /api/settings
│       ├── public.js     # /api/rooms, events, announcements, leaderboard
│       ├── admin.js      # /api/admin/* (protected, admin only)
│       └── pwa.js        # GET /api/pwa/manifest
├── prisma/
│   └── schema.prisma     # DB schema (PostgreSQL)
├── client/
│   ├── src/
│   │   ├── main.jsx      # React entry point
│   │   ├── App.jsx       # Routes
│   │   ├── i18n/         # TR/EN translations
│   │   ├── context/      # AuthContext, SettingsContext
│   │   ├── components/   # Navbar, Sidebar, FloatingChat, Layout
│   │   └── pages/        # HomePage, RoomPage, LoginPage, RegisterPage, Admin/*
│   ├── public/
│   │   └── sw.js         # Service worker
│   └── dist/             # Built frontend (served by Express)
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Default Credentials (after seed)
- **Admin**: admin@yokoajans.com / admin123
- **VIP**: vip@yokoajans.com / vip123
- **User**: sinema@yokoajans.com / user123

## Scripts
- `npm start` / `npm run dev` — Start server
- `npm run build:client` — Build React frontend
- `npm run seed` — Seed database
- `npx prisma db push` — Push schema to DB
- `npx prisma generate` — Regenerate Prisma client

## Key Features
1. **Homepage**: Hero, Live Cinema Rooms, Featured Event, Announcements, Leaderboard
2. **Cinema Room**: Video player placeholder, live chat via Socket.io, participant list, emoji reactions, admin moderation
3. **Admin Panel** (`/admin`): Site settings, PWA settings, Users, Rooms, Announcements, Events, Audit Log
4. **PWA**: Dynamic manifest from DB, service worker, offline shell
5. **i18n**: TR/EN with localStorage persistence, Turkish default
6. **Branding**: All text editable from admin panel, reflects instantly without redeploy

## Ports
- Server: 5000 (configurable via PORT env var)

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (managed by Replit)
- `JWT_SECRET` — JWT signing secret (set via environment secrets)
- `PORT` — Server port (default 5000)
- `NODE_ENV` — Environment (development/production)
