# 🍴 hungr.

### Swipe. Match. Eat.

**NUS Orbital 2026 Apollo 11**

**Team:** Tan Jeng Khiang Damien, Jenna Ng Kai Ern

Milestone 3 submission

See the README pdf for more details

---

## Running Locally

These instructions will get you a copy of the project up and running on your local machine for development and testing.

### Prerequisites

Make sure you have the following installed:

- Node.js (v16 or later)
- Expo Go app on your iOS/Android device

### Set Up

Run the following commands in a terminal:

```bash
git clone https://github.com/damientjk/hungr.git
cd hungr
npm run install:all
```

Create a file in `mobile/.env` with the following code:

```
EXPO_PUBLIC_SUPABASE_URL=https://xblrligzryazzlrcfbtw.supabase.co

EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhibHJsaWd6cnlhenpscmNmYnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MzA5NzgsImV4cCI6MjA5NTEwNjk3OH0.PPrELBtqMMxzmIAsDYJVp3Oz91HTTa7rS1PKmzXhgm0

EXPO_PUBLIC_API_URL=https://hungr-2oqk.onrender.com
```

### Testing

Start the app:

```bash
npm run mobile
```

Scan the QR in your terminal with Expo Go (or iPhone/Android Camera App).

- This step may take between 30–90 seconds on the first launch as the Render free-tier server takes a while to wake up from sleep.

**Note**: There is no need to run the backend on your device locally for testing as the backend automatically runs on an online service called Render. This ensures that sensitive API keys are not shared with the public. The backend code as well the SQL code for Supabase are still available in the Github repo for reference.
