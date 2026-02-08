# Product Requirements Document: Super Bowl Party Betting App

## Overview

A local-network web application that allows guests at a Super Bowl party to create and accept prop bets with custom stakes. The app runs entirely on a single laptop (server, database, and live dashboard) with guests connecting via their phones over the same WiFi network.

The app is not a gambling platform. Stakes are freeform — "take a shot", "do 10 pushups", "wear a funny hat for a quarter" — though monetary stakes are supported if participants choose. Resolution and fulfillment operate on the honor system.

---

## Constraints

- **Zero cost.** Every technology, library, and service used must be free and open source. No paid APIs, no cloud hosting, no subscriptions. The app runs entirely on local hardware.

## Goals

- Zero-friction betting experience that anyone at the party can use within seconds
- Real-time visibility of all betting activity to drive engagement and energy
- Fully self-contained — no cloud services, no accounts, no app installs
- Simple enough to build and deploy before game day

## Non-Goals

- Automated outcome verification (honor system only)
- Real money payment processing
- Multi-outcome markets (future consideration)
- One-to-many bets (future consideration)
- Persistent data beyond the party (nice-to-have, not required)

---

## User Roles

### Guest
Any party attendee. Can create bets, accept bets, and resolve bets they're involved in.

### Host (stretch goal)
The party organizer. Same capabilities as a guest, plus the ability to resolve any bet and manage the dashboard. Not required for v1 — all guests have equal permissions.

---

## User Identity

- Guests register with a **display name** and **phone number**
- Phone number is the unique identifier and primary key
- If a guest disconnects and reconnects (closes browser, loses WiFi, switches devices), entering the same phone number restores their session and full bet history
- No passwords, no email, no OAuth — keep it frictionless
- Phone numbers are only used for identity matching, not for sending messages

---

## Core Concepts

### Bet

A bet is a standalone proposition between two people. It consists of:

| Field | Description |
|---|---|
| Proposition | A freeform yes/no statement (e.g. "Chiefs win the coin toss") |
| Stake | Freeform text describing what's on the line (e.g. "a shot", "$5") |
| Creator | The guest who created the bet |
| Creator Side | "Yes" or "No" — what the creator believes |
| Acceptor | The guest who takes the opposite side (null until accepted) |
| Status | The current lifecycle state of the bet |
| Outcome | The resolved result — Yes or No (null until resolved) |
| Created At | Timestamp |

### Bet Lifecycle

```
Open → Accepted → Resolved → Completed
              ↘
         Cancelled (from Open only)
```

| State | Description |
|---|---|
| **Open** | Created by a guest, visible in the public feed, waiting for someone to accept |
| **Accepted** | Another guest has taken the opposite side. Both parties are locked in. |
| **Resolved** | Either party has declared the outcome (Yes or No happened). The app determines who won and who owes. |
| **Completed** | The losing party has fulfilled their stake (honor system — either party can mark this). |
| **Cancelled** | The creator withdrew the bet before anyone accepted it. |

### Stake Matching

Stakes are **symmetric**. When a guest accepts a bet, they are agreeing to the same stake on the opposite side. There is no counter-offering or asymmetric stakes in v1.

Example:
> **Creator:** "I bet **a shot** that **the first play is a run**" (Side: Yes)
> **Acceptor clicks Accept** → They are betting a shot that the first play is NOT a run (Side: No)
> **Outcome:** First play is a pass → Proposition is No → Creator loses → Creator owes a shot

---

## Screens & User Flows

### 1. Registration Screen

**Path:** First screen on load (if no existing session)

- Input: Display name (text)
- Input: Phone number (tel)
- Button: "Join the Party"
- If the phone number already exists, restore the existing session and redirect to the main feed
- Minimal validation — just ensure both fields are non-empty and phone number is plausible

### 2. Main Feed (Home Screen)

**Path:** `/` (after registration)

The primary screen. Shows all betting activity in reverse chronological order.

**Tabs/Filters:**
- **Open Bets** — Bets waiting to be accepted (excluding your own). Primary view.
- **My Bets** — All bets you've created or accepted, grouped by status.
- **All Activity** — Full feed of all bets in all states.

**Each bet card displays:**
- The proposition text
- The stake
- The creator's name and their side (Yes/No)
- The current status
- Contextual action button (Accept / Resolve / Mark Completed — depending on state and user)

**Actions from the feed:**
- Tap a bet card to see full details
- "Create Bet" button (persistent, always accessible — floating action button or header button)

### 3. Create Bet Screen

**Path:** Modal or `/create`

- Input: Proposition (text, e.g. "Mahomes throws an interception in the first half")
- Input: Stake (text, e.g. "a shot", "loser does dishes")
- Toggle: Your side — Yes or No
- Button: "Post Bet"
- On submit, bet enters the Open state and appears in the public feed

### 4. Bet Detail Screen

**Path:** `/bet/:id`

Shows full bet information and available actions:

- All bet fields (proposition, stake, creator, acceptor, sides, status, outcome, timestamps)
- **If Open + you are NOT the creator:** "Accept Bet" button
- **If Open + you ARE the creator:** "Cancel Bet" button
- **If Accepted + you are a participant:** "Resolve" button with Yes/No outcome selection
- **If Resolved + you are a participant:** "Mark Completed" button (acknowledges stake was fulfilled)

### 5. Live Dashboard (Host Laptop Screen)

**Path:** `/dashboard`

Designed to be displayed on the host laptop's screen for all guests to see. Auto-refreshes in real-time.

**Sections:**

- **Open Bets Ticker** — Scrolling/rotating display of bets waiting to be accepted. Encourages guests to pull out their phones and accept.
- **Recent Activity** — Last N bets that were accepted, resolved, or completed. Shows the action, e.g. "Mike accepted Sarah's bet: a shot on 'First TD is a rush'"
- **Leaderboard / Shame Board** — Ranked list of guests by:
  - Outstanding debts (bets lost but not yet completed)
  - Total bets placed
  - Win/loss record
- **Stats** — Total bets created, accepted, resolved. Keeps energy up.

The dashboard should be visually distinct from the mobile views — larger text, bolder layout, optimized for viewing from across a room.

---

## Real-Time Behavior

All clients (phones and dashboard) must reflect changes in real-time without manual refresh:

- When a bet is created, it appears in all clients' Open Bets feed
- When a bet is accepted, it moves out of Open and into Accepted across all clients
- When a bet is resolved, the outcome and winner/loser are shown immediately
- The dashboard updates continuously

**Implementation approach:** WebSockets for push-based real-time updates. The server broadcasts state changes to all connected clients.

---

## Data Model

### User
```
id: UUID (primary key)
name: String
phone: String (unique, used for session recovery)
created_at: Timestamp
```

### Bet
```
id: UUID (primary key)
proposition: String
stake: String
creator_id: UUID (FK → User)
creator_side: Enum (YES, NO)
acceptor_id: UUID (FK → User, nullable)
status: Enum (OPEN, ACCEPTED, RESOLVED, COMPLETED, CANCELLED)
outcome: Enum (YES, NO, nullable)
winner_id: UUID (FK → User, nullable, derived on resolution)
loser_id: UUID (FK → User, nullable, derived on resolution)
created_at: Timestamp
accepted_at: Timestamp (nullable)
resolved_at: Timestamp (nullable)
completed_at: Timestamp (nullable)
```

---

## Technical Architecture

### Deployment Model

Everything runs on a single laptop connected to the party's WiFi network.

```
[Guest Phone] ←→ WiFi ←→ [Host Laptop]
[Guest Phone] ←→ WiFi ←→   - Web Server
[Guest Phone] ←→ WiFi ←→   - Database
[Dashboard]   ←→ (localhost) - Frontend (Dashboard view)
```

Guests navigate to the laptop's local IP address (e.g. `http://192.168.1.100:3000`) on their phone browser. No app install needed.

### Recommended Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Server** | Node.js + Express | Fast to build, good WebSocket support |
| **Database** | SQLite | Zero-config, file-based, runs locally, no DB server needed |
| **Real-time** | Socket.IO (WebSockets) | Reliable real-time push with fallback to polling |
| **Frontend** | React (single-page app) | Component-based, fast development, good mobile UX |
| **Styling** | Tailwind CSS | Rapid UI development, responsive out of the box |

### Networking

- The server binds to `0.0.0.0:3000` so it's accessible from any device on the local network
- On startup, the app prints the local IP and port for the host to share (or display a QR code)
- No HTTPS required (local network, no sensitive data beyond phone numbers)

---

## API Endpoints (REST + WebSocket)

### REST

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/users` | Register or restore session (name + phone) |
| GET | `/api/users/:id` | Get user profile and stats |
| POST | `/api/bets` | Create a new bet |
| GET | `/api/bets` | List bets (filterable by status, user) |
| GET | `/api/bets/:id` | Get bet detail |
| POST | `/api/bets/:id/accept` | Accept an open bet |
| POST | `/api/bets/:id/cancel` | Cancel an open bet (creator only) |
| POST | `/api/bets/:id/resolve` | Resolve a bet with outcome (participant only) |
| POST | `/api/bets/:id/complete` | Mark stake as fulfilled (participant only) |
| GET | `/api/leaderboard` | Get leaderboard data |

### WebSocket Events

| Event | Direction | Payload |
|---|---|---|
| `bet:created` | Server → All | Full bet object |
| `bet:accepted` | Server → All | Bet ID + acceptor info |
| `bet:resolved` | Server → All | Bet ID + outcome + winner/loser |
| `bet:completed` | Server → All | Bet ID |
| `bet:cancelled` | Server → All | Bet ID |
| `stats:updated` | Server → All | Updated leaderboard/stats |

---

## Edge Cases & Rules

- **Self-acceptance:** A user cannot accept their own bet.
- **Double-acceptance:** Once a bet is accepted, no one else can accept it. First come, first served (enforced server-side).
- **Resolution disputes:** Since either participant can resolve, there's a theoretical conflict. For v1, the first resolution stands. This is an honor-system app — trust the guests.
- **Disconnection:** Session is tied to phone number. Reconnecting with the same phone number restores everything. No data is lost (SQLite persists to disk).
- **Name collisions:** Two guests with the same name is fine — phone number is the real identifier. Display names are cosmetic.
- **Empty states:** The feed should have friendly messaging when there are no open bets ("No bets yet — be the first!").

---

## Future Considerations (Out of Scope for v1)

- **Multi-outcome markets:** A single proposition with 3+ possible outcomes (e.g. "Who scores the first TD?" with a list of players). Requires a different bet-matching model.
- **One-to-many bets:** A single bet that multiple people can accept, creating multiple 1:1 pairings against the creator.
- **Asymmetric stakes:** Counter-offers where the acceptor proposes a different stake.
- **Host controls:** A privileged "host" role that can resolve any bet, remove bets, or moderate content.
- **Automated resolution:** Integration with a sports data API to auto-resolve common prop bets.
- **Persistent history:** Export bet history after the party (CSV, shareable link, etc.).
- **Pre-game market seeding:** The host pre-creates a set of common Super Bowl prop bets before guests arrive.
- **QR code join:** Display a QR code on the dashboard that guests scan to connect instantly.

---

## Success Criteria

- A guest can go from opening their phone browser to placing a bet in under 30 seconds
- All connected clients see bet updates within 1 second
- The dashboard is readable from 10+ feet away
- The system handles 20-30 concurrent users without degradation
- The app runs for 5+ hours (full game + pre/post) without crashing

---

## Implementation Priorities

### Phase 1 — Minimum Viable Party (MVP)
1. User registration with phone-based session recovery
2. Create and accept bets
3. Real-time feed with WebSocket updates
4. Resolve and complete bets
5. Basic mobile-responsive UI

### Phase 2 — Party Energy
6. Live dashboard for the host laptop
7. Leaderboard / shame board
8. Stats and activity feed

### Phase 3 — Polish
9. QR code for easy joining
10. Sound/visual notifications for new bets
11. Bet categories or tags
12. Export/share results after the party
