# Hungr

**Orbital 2026 — Apollo 11**

**Team:** Tan Jeng Khiang Damien · Jenna Ng Kai Ern

---

## Motivation

Deciding where to eat as a pair or group is a universally frustrating experience. We are always spoiled for choice so reaching a consensus on where to dine is often exhausting and conversations are circular. Hungr is a shared food decision-making app where groups can swipe simultaneously on nearby dining options, drawing on the intuitive mechanics of dating apps. By surfacing only the options that the whole group collectively likes, users skip the back-and-forth entirely and arrive at a decision that everyone is happy with — turning one of the most common social frustrations into an efficient and enjoyable experience.

---

## User Stories

- As a group of friends who want to decide where to eat, we are able to create a group session and invite members via a shared code so that everyone can participate in the decision at the same time.
- As a session host who wants to tailor the session to the group's needs, I will be able to filter suggested restaurants by price, location, and cuisine so that only relevant options are shown during the swipe session.
- As a group member who wants to reach a consensus quickly, I am able to swipe right or left on restaurants and see a match when all members have liked the same option.
- As a user who wants to keep track of places I enjoy, I am able to save restaurants to a personal favourites list so I can easily revisit them in future sessions.

---

## Features

### Current feautures 
**User authentication** 
Sign up and log in to a personal account 
In the account, users are able to see restaurants nearby them and save the restaurant to their bookmarks

**Session Creation**
Start a session
- Title the session which generates a unique invite code that is shareable
- Start swiping button to commence the swiping session is available to the creator of the session

**Joining a session**
- With the unique code, users are able to join the same swiping session
- We fetch restaurants from Google Plaes API, filtered by location
- In each swiping session, 20 restaurants located nearest to the group is shown 
- Once all users in the session have completed swiping, the restaurant with the highest number of like swipes is shown to the group

### Features being developed
**Personal Favourites Lists** 
- Save restaurants encountered during browsing or sessions to a personal list
- Allow users to use the restaurants in the personal list within a swiping session

**Session History**
- View restaurants seen in past sessions under a sesion history tab which will show the name of the group as well as a ranking of all the restaurants the group swiped on

**Filtering** 
- Allow users to filter restaurants nearby by price and cuisine before starting a swiping session

---

## Design & Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native (Expo) |
| Backend API | Node.js (TypeScript) |
| Database | Supabase |
| Auth | Supabase Auth |
| Maps / Places | Google Places API |

### System Overview

```
┌─────────────────────┐        ┌──────────────────────────┐
│   Expo Mobile App   │◄──────►│   Express Backend (3000) │
│  (React Native)     │  REST  │   + Auth middleware       │
└─────────────────────┘        └────────────┬─────────────┘
                                            │ service role
                                ┌───────────▼─────────────┐
                                │  Supabase (PostgreSQL)   │
                                │  • restaurants           │
                                │  • sessions              │
                                │  • session_participants  │
                                │  • session_restaurants   │
                                │  • swipes                │
                                │  • bookmarks             │
                                └─────────────────────────┘
```

### Key Design Decisions

**Session-scoped swiping** — When the group leader starts a session, the backend fetches and stores a fixed set of 20 restaurants (`session_restaurants`). Every member swipes the exact same deck, making match detection meaningful.

**Match detection** — A unanimous match requires every participant to have swiped right on the same restaurant within the session. If no full match exists, the app surfaces the most-liked restaurant as a fallback. Results are only revealed once every member has finished swiping.

**Real-time sync** — Session status changes (e.g. leader starting the swipe) propagate to all members via a 3-second polling loop against the backend (avoiding RLS-related issues with direct Supabase queries). Supabase Realtime is used as an optional fast path.

**Rate limiting** — API requests are rate-limited per authenticated user (via the `Authorization` header) rather than per IP, so multiple users sharing a Codespaces environment do not block each other.

---

## Milestone Plan

### Milestone 1 — Technical Proof of Concept
*A minimal working system with basic frontend and backend integration.*

- [x] User authentication with basic profile creation
- [x] Backend integration with Google Places API (location-based restaurant fetch)
- [x] Basic session creation with shareable invite code
- [x] Swipe interface rendering restaurant cards

### Milestone 2 — Prototype (Core Features)
*A working system with all core features implemented.*

- [ ] Cuisine preference setup on user profile
- [ ] Session creation with filtering by location, cuisine, and price range
- [x] Join a session via invite code and swipe in real time
- [x] Match detection — results screen shown only after all members have finished swiping
- [ ] Basic UI/UX improvements

### Milestone 3 — Extended System (Core + Extensions)
*A polished system with extension features integrated.*

- [ ] Personal favourites list (bookmark restaurants)
- [ ] Session history (view restaurants from past sessions)
- [ ] Combined favourites filtering (seed session deck from participants' saved restaurants)
- [ ] UI/UX polish, edge case handling, and bug fixes

---

## Software Engineering Practices

**Version Control** — GitHub with feature branches. All changes merge into `main` via pull requests reviewed by the other team member.

**Testing** — Unit tests for backend logic; structured user testing after each milestone with feedback-driven iteration.

**Code Quality** — DRY principle; reusable functions extracted where logic is shared across routes or components.

**Single Responsibility** — Each module, route handler, and component has one clearly defined responsibility to keep the codebase maintainable and testable.

---
