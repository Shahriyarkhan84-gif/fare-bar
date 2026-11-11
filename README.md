# Fare Bar

A delivery driver profit analyser for Uber Eats and Deliveroo, built to PRD v4 Phase 1 as a web app. Plain HTML, CSS and JavaScript with no build step:

- `index.html` — the pages
- `styles.css` — the look
- `app.js` — the profit maths, delivery log, login and trial

Live at https://fare-bar.vercel.app

## Profit model

Net profit = rate (+ expected tip, Uber Eats only) − (outbound + return miles) × cost per mile − time cost − tax

- **Cost per mile** = fuel price per litre × 4.54609 ÷ MPG (UK gallon), plus an optional running cost per mile. Bikes and e-bikes: running cost only
- **Uber Eats** offers exclude tips, so the driver's expected tip is added; **Deliveroo** fees are the full amount
- **Time cost** = your time cost per hour × minutes ÷ 60
- **Tax** = tax estimate % of the profit, when the profit is positive
- **Assume return = outbound** fills in the return miles

Home shows the offer pill only when an order pops up (a scan or link brings one in); otherwise it is hidden. Log delivery and Cost model show it as a live preview while you type. Each offer shows as a pill: a dot (green = profit, red = loss), then the pay, the total miles there and back, and the time, under "New offer detected". Straight under it, in large type: "Profit £16.06" or "Loss £1.34", with the platform, the miles and the pay per hour (and a note when it is under your target). The last two logged offers show as smaller pills underneath.

Status compares net profit per hour with your target: green at or above target (a "Strong offer" from 125%), yellow from 70%, red below that.

## PRD v4 coverage (Phase 1)

| ID | Requirement | Status |
|---|---|---|
| FR-01 | Two-line bar plus a verdict line with the platform | Done |
| FR-02 | Android automatic pop-up | Phase 2 — not in this web app |
| FR-03 | iPhone one-tap detection | Done |
| FR-04 | Per-platform reading (Uber Eats without tip, Deliveroo full fee, km to miles) | Done |
| FR-05 | Outbound + return-to-start miles | Done |
| FR-06 | Active switch | Done |
| FR-07 | Keep only the offer's numbers | Done: addresses are never stored |
| FR-08 | Never taps Accept or Decline | Done |
| FR-09 | Log accepted offers | Done with one tap (Accepted / Declined); automatic on Android in Phase 2 |
| FR-10 | Dashboard split by platform | Done |
| FR-11 | Vehicle type, running cost, expected Uber Eats tip | Done |
| FR-12 | Verdict banners | Done |
| FR-13 | Accessibility | Partly: labelled controls and live regions |
| FR-14 | Weekly report: seen vs taken, per platform | Done |
| FR-15 | CSV export | Done |

## Pages

- **Home** — Active switch, the offer pill and Profit / Loss line, today's totals split by platform, session, recent deliveries, Export CSV
- **Weekly report** — last 7 days per platform: offers seen, taken, net, per hour, per mile
- **Log delivery** — platform, rate, outbound and return miles, time
- **Cost model** — MPG, fuel price, target per hour, time cost, tax estimate, assume-return toggle
- **Auto-detect** — Shortcut steps and a box to paste request text
- **Control Centre** — Shortcut steps, copy app link, install the Home Screen icon
- **Subscription** — Pro and Unlimited, each with a 30-day free trial (sample prices, no payments)
- **Profile** — email, plan, join date, change password, log out

## Auto-detect and the Active switch

iOS does not let an app read another app's screen, so detection is one tap, not zero:

- A Shortcut takes a screenshot, extracts its text and opens `#text=<the text>` (after a `#`, so the offer text never reaches the server; `?text=` still works). The app finds the platform ("Deliveroo" or "Uber" in the text), the rate (largest £ amount), the outbound distance (the one marked "total", otherwise all distances added; km is converted to miles) and the time (largest "min")
- `?fare=3.07&miles=1&mins=7.5` sends the numbers directly
- **Active** on Home turns this on and off. When off, the bar shows OFF and incoming orders are ignored

## Install on iPhone

`fare-bar.mobileconfig` is an iOS configuration profile containing one Web Clip. Installing it adds the Fare Bar icon to the Home Screen and opens the app full screen. It changes no other settings and is not signed, so iOS shows it as "Not Signed". `vercel.json` serves it with the content type iOS expects.

## Backend

Supabase project `fare-bar` (eu-west-2). The page ships the project URL and the **publishable** key only. Every table has row level security.

- **Accounts** — Supabase Auth, email and password
- **`public.deliveries`** — logged offers, accepted or declined, with platform, vehicle and expected tip; a signed-in user can read, add and delete only their own
- **`public.trials`** — one row per user: `plan` and `started_at`; owner-readable, insert-once, never changed, start time set by the database
- **`public.owners`** — accounts that get everything free; only the project admin can add rows

The cost model, the current offer, the session start and the Active switch are remembered on the device.
