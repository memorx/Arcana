# Roadmap

Work I plan to do on Arcana, roughly in order. Estimates are hours of hands-on work.

## 1. Keep the AI side current (~4 h)

- [ ] Move interpretations off `claude-sonnet-4-20250514` and the daily card off
      `claude-3-5-haiku-20241022` to current Claude models, with the model names in config instead
      of hard-coded.
- [ ] Compare old and new outputs on a fixed set of readings (tone, length, both languages) before
      switching.
- [ ] Handle API errors and timeouts so a failed interpretation refunds the credit and lets the user
      retry.

## 2. Framework upgrades (~4 h)

- [ ] Auth.js from the v5 beta to the stable release.
- [ ] Next.js 15 → 16, and the dependencies that come with it (next-intl, next-pwa, Sentry).

## 3. Harden the background jobs (~3 h)

- [ ] Cron routes refuse to run when `CRON_SECRET` is missing instead of comparing against
      `Bearer undefined`.
- [ ] Make subscription renewal idempotent, so a cron retry never charges or grants credits twice.
- [ ] Tests for both cron routes (there are none today).

## 4. Tests for the game layer (~5 h)

- [ ] Unit tests for achievements, challenges, streaks, XP and levels, and golden cards
      (`src/lib`), which have no tests yet.
- [ ] Playwright flow for a full day: daily card → reading → XP and streak update → achievement.

## 5. Reading experience (~6 h)

- [ ] Follow-up questions on a finished reading, using the same cards as context.
- [ ] Favorites and a private journal note on each reading.
- [ ] A share image per reading (Open Graph) instead of the generic one.

## 6. Daily Oracle beyond email (~4 h)

- [ ] Web push for the daily card from the PWA, with the time chosen by the user.
- [ ] Offline access to past readings.

## 7. Quality (~4 h)

- [ ] CI on GitHub Actions: lint, type check, Jest and the Playwright smoke test on every pull
      request.
- [ ] Accessibility pass: keyboard support for drawing and flipping cards, `prefers-reduced-motion`
      for the animations, color contrast.
- [ ] Move the remaining hard-coded strings into `messages/` and add Portuguese.

Total: about 30 hours.
