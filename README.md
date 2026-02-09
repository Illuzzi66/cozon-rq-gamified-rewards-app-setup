# Cozon RQ - Gamified Rewards App

A gamified rewards application where users earn coins through various activities like completing tasks, spinning wheels, watching ads, and interacting with memes.

## Features

- 🎰 **Spin Wheel** - Daily spins with rewards
- ✅ **Tasks System** - Complete tasks to earn coins
- 🎭 **Meme Feed** - Like, comment, and post memes (Premium)
- 📺 **Video Ads** - Watch ads to earn rewards
- 💰 **Withdrawals** - Cash out via Paystack ($5 minimum)
- 👑 **Premium Membership** - 2.5× earnings and exclusive features
- 🏆 **Leaderboards** - Compete for top rankings
- 🔔 **Push Notifications** - Real-time alerts for rewards and achievements

## Setup

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- AdMob account (for ads)
- Paystack account (for withdrawals)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

4. Generate VAPID keys for push notifications:
   ```bash
   npx web-push generate-vapid-keys
   ```
   Add the public key to `.env` as `VITE_VAPID_PUBLIC_KEY`

5. Configure Supabase secrets for the edge function:
   - `VAPID_PUBLIC_KEY` - Your VAPID public key
   - `VAPID_PRIVATE_KEY` - Your VAPID private key
   - `VAPID_SUBJECT` - mailto:support@cozonrq.com

6. Start the development server:
   ```bash
   npm run dev
   ```

## Push Notifications Setup

### Database Triggers

The app uses database triggers to automatically create notifications for:
- Withdrawal status changes (approved, rejected, completed)
- Achievement unlocks (first spin, milestones, premium upgrade)
- Referral rewards
- Task completions
- Leaderboard rewards

### Service Worker

The service worker (`public/sw.js`) handles:
- Push notification display
- Notification click actions
- Background sync

### User Subscription

Users can enable push notifications from their profile settings. The app will:
1. Request notification permission
2. Register the service worker
3. Subscribe to push notifications using VAPID
4. Save the subscription to the database

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Edge Functions, Realtime)
- **Ads**: AdMob
- **Payments**: Paystack
- **Notifications**: Web Push API with VAPID

## Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React contexts (Auth, etc.)
├── hooks/          # Custom React hooks
├── lib/            # Utilities and configurations
├── pages/          # Page components
└── types/          # TypeScript type definitions

supabase/
└── functions/      # Edge functions
    └── send-push-notification/  # Push notification handler

public/
├── sw.js           # Service worker for push notifications
├── manifest.json   # PWA manifest
└── icons/          # App icons
```

## License

Proprietary - All rights reserved
