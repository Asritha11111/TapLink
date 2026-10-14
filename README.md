# TapLink

> A real-time communication platform using personalized tap patterns and voice commands.
>
> **Team:** Warlocks · **Capstone 2026** · [Asritha11111/TapLink](https://github.com/Asritha11111/TapLink)

---

## Problem Statement

Normal communication can be difficult or impossible in situations such as loud environments, physical constraints, or emergencies. TapLink provides an alternative channel through personalized tap patterns, voice commands, and emergency alerts — all delivered in real time.

---

## Features

| Feature | Status |
|---|---|
| User registration & login (JWT + bcrypt) | ✅ Implemented |
| Personalized TapCode patterns (S/L encoding) | ✅ Implemented |
| TapCode CRUD + pattern matching | ✅ Implemented |
| Real-time messaging (Socket.IO) | ✅ Implemented |
| Typing indicators | ✅ Implemented |
| Online status tracking | ✅ Implemented |
| Contact management (add/remove/search) | ✅ Implemented |
| Emergency alerts with location | ✅ Implemented |
| Voice commands (Web Speech API) | ✅ Implemented (Chrome/Edge) |
| Location sharing with consent | ✅ Implemented |
| Message history + pagination | ✅ Implemented |
| Bluetooth/mesh networking | ❌ Not implemented (v2 roadmap) |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, React Router v7, Axios, Socket.IO Client |
| Backend | Node.js 24, Express 5, Socket.IO 4 |
| Database | PostgreSQL + Prisma ORM |
| Authentication | JWT (jsonwebtoken) + bcrypt |
| Voice Commands | Web Speech API (browser-native) |
| Location | Browser Geolocation API (explicit consent) |
| Tests | Jest + Supertest (backend) · Vitest + Testing Library (frontend) |

---

## Project Structure

```
TapLink/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Full DB schema
│   │   └── migrations/            # Prisma migrations
│   ├── src/
│   │   ├── config/prisma.js       # Shared PrismaClient
│   │   ├── controllers/           # Request handlers
│   │   ├── middleware/            # Auth + validation
│   │   ├── routes/                # Route definitions
│   │   ├── services/              # Business logic
│   │   ├── sockets/               # Socket.IO handler
│   │   └── server.js              # Entry point
│   ├── tests/auth.test.js         # Backend tests
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── __tests__/             # Vitest tests
│   │   ├── components/AppLayout   # Shared layout
│   │   ├── context/               # Auth + Online contexts
│   │   ├── pages/                 # All page components
│   │   ├── services/              # api.js + socket.js
│   │   └── styles/                # Per-feature CSS
│   ├── index.html
│   └── package.json
│
├── .gitignore
├── .env.example
└── README.md
```

---

## Prerequisites

- **Node.js** ≥ 20.x
- **npm** ≥ 10.x
- **PostgreSQL** ≥ 14 (running locally or remote)
- **Git**
- A supported browser for voice commands: **Chrome** or **Edge**

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Asritha11111/TapLink.git
cd TapLink
```

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
# Then edit backend/.env with your real values (see below)
```

**backend/.env**:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/taplink
JWT_SECRET=replace_with_a_long_random_secret_at_least_32_chars
JWT_EXPIRES_IN=1d
CLIENT_ORIGIN=http://localhost:5173
```

> ⚠️ Never commit `.env`. It is already in `.gitignore`.

---

## PostgreSQL Setup

```bash
# Create the database (run in psql or pgAdmin)
CREATE DATABASE taplink;

# Run Prisma migrations
cd backend
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to inspect data
npx prisma studio
```

---

## Running the Application

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd backend
npm install
npm run dev          # starts on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev          # starts on http://localhost:5173
```

Visit **http://localhost:5173** in your browser.

---

## Running Tests

**Backend (Jest + Supertest):**
```bash
cd backend
npm test
# 18 tests total
# DB-dependent tests skip gracefully if PostgreSQL is not connected
```

**Frontend (Vitest + Testing Library):**
```bash
cd frontend
npm test -- --run
# 4 tests total
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Register user |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | JWT | Current user |
| GET | `/api/users/search?q=` | JWT | Search users |
| GET | `/api/contacts` | JWT | List contacts |
| POST | `/api/contacts` | JWT | Add contact |
| DELETE | `/api/contacts/:targetId` | JWT | Remove contact |
| GET | `/api/conversations` | JWT | List conversations |
| POST | `/api/conversations` | JWT | Get/create conversation |
| GET | `/api/conversations/:id/messages` | JWT | Message history |
| POST | `/api/conversations/:id/messages` | JWT | Send message |
| GET | `/api/tapcodes` | JWT | List TapCodes |
| POST | `/api/tapcodes` | JWT | Create TapCode |
| POST | `/api/tapcodes/match` | JWT | Match tap pattern |
| GET | `/api/tapcodes/:id` | JWT | Get TapCode |
| PUT | `/api/tapcodes/:id` | JWT | Update TapCode |
| DELETE | `/api/tapcodes/:id` | JWT | Delete TapCode |
| POST | `/api/emergency` | JWT | Send emergency alert |
| GET | `/api/emergency` | JWT | Get incoming alerts |
| PATCH | `/api/emergency/:id/read` | JWT | Mark alert read |
| POST | `/api/location` | JWT | Share location |

All authenticated endpoints require: `Authorization: Bearer <token>`

---

## TapCode System

**Pattern encoding:** Each tap is classified as:
- **S** (Short) = press held < 300 ms
- **L** (Long)  = press held ≥ 300 ms

**Grouping:** Taps are grouped into one pattern while gaps between consecutive taps are < 1500 ms. A gap ≥ 1500 ms finalizes the pattern.

**Example:** SOS = `["S","S","S","L","L","L","S","S","S"]` displayed as `· · · — — — · · ·`

---

## Voice Commands (Chrome/Edge only)

| Say | Action |
|---|---|
| "home" | Navigate to Home |
| "contacts" | Navigate to Contacts |
| "message" | Navigate to Messages |
| "tap" / "tapcode" | Navigate to TapCodes |
| "settings" | Navigate to Settings |
| "emergency" / "help me" / "SOS" | Navigate to Emergency (requires confirmation) |
| "go back" | Browser back |

> Voice recognition requires HTTPS in production and an active internet connection.

---

## Socket.IO Events

| Event | Direction | Description |
|---|---|---|
| `user:online` | Server→Client | User connected |
| `user:offline` | Server→Client | User disconnected |
| `conversation:join` | Client→Server | Join a conversation room |
| `conversation:leave` | Client→Server | Leave a conversation room |
| `message:new` | Server→Client | New message in conversation |
| `message:notification` | Server→Client | Message notification (personal room) |
| `typing:start` | Bidirectional | User started typing |
| `typing:stop` | Bidirectional | User stopped typing |

---

## Security Notes

- Passwords are hashed with bcrypt (12 rounds)
- JWT tokens expire after 1 day
- User identity is derived from the verified token, never from request body
- Messages and TapCodes can only be accessed by their owners
- Emergency alerts can only be sent to existing contacts
- Location is only collected with explicit user interaction
- CORS is restricted to `CLIENT_ORIGIN`

---

## Known Limitations

1. **PostgreSQL required** — the app cannot run without a database connection
2. **Voice commands** — only work in Chromium-based browsers (Chrome, Edge); require internet
3. **No Bluetooth/mesh** — device-to-device local networking is not implemented
4. **Emergency alerts** — only notify TapLink contacts; do not contact real emergency services
5. **Location precision** — depends on browser/OS permissions and GPS availability
6. **TapCode timing** — relies on `Date.now()` timing which can vary on slow devices

---

## Git Workflow

```
main
  └── develop
       ├── feature/frontend       (teammate — UI design)
       ├── feature/backend-auth   (Asritha — backend implementation)
       ├── feature/tap-voice      (teammate — TapCode + voice)
       └── feature/database-realtime (teammate — DB + sockets)
```

Do **not** merge directly to `main` without team review.

---

## Demo Checklist

For project reviewers:

1. [ ] Register a new user at http://localhost:5173/register
2. [ ] Register a second user in another browser/incognito tab
3. [ ] Add the second user as a contact (search by email)
4. [ ] Start a conversation and send messages — verify real-time delivery
5. [ ] Create a TapCode: tap a pattern, assign a message
6. [ ] Use the tap area to trigger the pattern and see it matched
7. [ ] Send an emergency alert to the contact with optional location
8. [ ] Test voice commands in Chrome (say "open messages")
9. [ ] Check Settings page for browser capability status
10. [ ] Log out and verify JWT-protected routes return 401

---

## Team

| Member | Branch | Responsibility |
|---|---|---|
| Asritha | `feature/backend-auth` | Backend, Auth, APIs, DB Schema, Socket.IO |
| Harshini | `feature/frontend` | Frontend UI Design |
| TBD | `feature/tap-voice` | TapCode + Voice |
| TBD | `feature/database-realtime` | DB + Real-time |
