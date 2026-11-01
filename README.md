# Arcana

AI tarot readings in English and Spanish. You pick a spread, draw your cards, and Claude writes an
interpretation that ties the cards to your question. Live at **[readarcana.com](https://www.readarcana.com)**.

It's a side project I build and run on my own: a full product with accounts, payments, a daily
oracle by email, and a light game layer (XP, levels, streaks, achievements, challenges and a card
collection) to keep people coming back.

## What it does

- **Readings.** Classic spreads (single card, three cards, Celtic Cross, Horseshoe) and themed ones
  (love, career, the year ahead). All 78 cards, upright and reversed, with their meanings in both
  languages.
- **AI interpretation.** The reading, the question and the positions go to Claude, which writes the
  interpretation. A shorter, cheaper call writes the daily card.
- **Daily Oracle.** A free card every day, in the app and by email (Vercel cron + Resend).
- **Credits and subscriptions.** Credit packs and monthly or yearly plans with Stripe, priced in MXN.
- **Game layer.** XP and levels, streaks with rewards, achievements, weekly and monthly challenges,
  and a collection of every card you've drawn, including rare golden cards.
- **Sharing and referrals.** Public share links for a reading and a referral program that pays in
  credits.
- **PWA.** Installable on phones, with shortcuts to a new reading and the daily card.

## Stack

| Layer | Tools |
|---|---|
| App | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, Framer Motion |
| Data | PostgreSQL (Supabase) through Prisma 6 |
| Auth | Auth.js (NextAuth v5) with email/password and optional Google sign-in |
| Payments | Stripe Checkout, subscriptions and webhooks |
| AI | Anthropic Claude API |
| Email | Resend |
| Ops | Vercel (hosting and cron), Upstash Redis (rate limiting), Sentry |
| i18n | next-intl (English and Spanish) |
| Tests | Jest + React Testing Library (API routes, components, pricing, AI client) and Playwright (auth, reading flow, smoke) |

## Run it locally

Requires Node 20+ and a PostgreSQL database (a free Supabase project works).

```bash
npm install
cp .env.example .env      # fill in the values; every key is explained in the file
npm run db:push           # create the schema
npm run db:seed           # cards, spreads and base data
npm run dev               # http://localhost:3000
```

Payments, AI interpretations and emails need their own keys (Stripe, Anthropic and Resend).

```bash
npm test                  # unit tests (Jest)
npm run test:e2e          # end-to-end tests (Playwright)
```

## Project layout

```
src/app/(main)     reading flow, daily card, dashboard, collection, challenges, credits, profile
src/app/(auth)     login, registration, password reset
src/app/api        REST routes: readings, credits, Stripe webhook, cron jobs, stats
src/lib            Claude client, pricing, achievements, challenges, XP, streaks, golden cards
src/components     UI, tarot cards and animations
prisma/            schema, seeds and small maintenance scripts
messages/          English and Spanish strings
e2e/               Playwright specs
```

## Roadmap

What's next is in [ROADMAP.md](ROADMAP.md).

## License

[MIT](LICENSE)
