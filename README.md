# Fare Bar

A delivery driver profit analyser, built to PRD v3 ("Delivery Driver Profit Analyzer") as a web app. Plain HTML, CSS and JavaScript with no build step:

- `index.html` — the pages
- `styles.css` — the look
- `app.js` — the profit maths, delivery log, login and trial

Live at https://fare-bar.vercel.app

## Profit model

Net profit = rate − (outbound + return miles) × cost per mile − time cost − tax

- **Cost per mile** = fuel price per litre × 4.54609 ÷ MPG (UK gallon)
- **Time cost** = your time cost per hour × minutes ÷ 60
- **Tax** = tax estimate % of the profit, when the profit is positive
- **Assume return = outbound** fills in the return miles

The bar always shows two lines: `Rate + MILEAGE = profit+return` and `(rate) + total miles = net profit`.

Status compares net profit per hour with your target: green at or above target (a "Strong offer" from 125%), yellow from 70%, red below that.

## PRD coverage

| ID | Requirement | Status |
|---|---|---|
| FR-01 | AssistiveTouch $ button opens the bar | Partly: AssistiveTouch runs a Shortcut that opens the app; a web app cannot float over other apps |
| FR-02 | Two-line bar with equals sign | Done |
| FR-03 | Outbound + return-to-start mileage | Done |
| FR-04 | Log Delivery | Done |
| FR-05 | Live Activity / Dynamic Island | Not possible in a web app |
| FR-06 | "Assume return = outbound" toggle | Done |
| FR-07 | Session with running net profit | Done |
| FR-08 | Dashboard: today totals, recent deliveries | Done |
| FR-09 | Cost model (MPG, fuel, target per hour) | Done |
| FR-10 | Banners: low offer, strong offer, below target | Done, inside the app |
| FR-11 | Export CSV | Done |
| FR-12 | Dynamic Type, VoiceOver | Partly: labelled controls and live regions; not tested with VoiceOver |

## Pages

- **Home** — Active switch, the bar and its banner, "Log this delivery", today's totals, session, recent deliveries, Export CSV
- **Log delivery** — platform, rate, outbound and return miles, time
- **Cost model** — MPG, fuel price, target per hour, time cost, tax estimate, assume-return toggle
- **Auto-detect** — Shortcut steps and a box to paste request text
- **Control Centre** — Shortcut steps, copy app link, install the Home Screen icon
- **Subscription** — Pro and Unlimited, each with a 30-day free trial (sample prices, no payments)
- **Profile** — email, plan, join date, change password, log out

## Auto-detect and the Active switch

iOS does not let an app read another app's screen, so detection is one tap, not zero:

- A Shortcut takes a screenshot, extracts its text and opens `?text=<the text>`. The app finds the rate (largest £ amount), the outbound distance (the one marked "total", otherwise all distances added; km is converted to miles) and the time (largest "min")
- `?fare=3.07&miles=1&mins=7.5` sends the numbers directly
- **Active** on Home turns this on and off. When off, the bar shows OFF and incoming orders are ignored

## Install on iPhone

`fare-bar.mobileconfig` is an iOS configuration profile containing one Web Clip. Installing it adds the Fare Bar icon to the Home Screen and opens the app full screen. It changes no other settings and is not signed, so iOS shows it as "Not Signed". `vercel.json` serves it with the content type iOS expects.

## Backend

Supabase project `fare-bar` (eu-west-2). The page ships the project URL and the **publishable** key only. Every table has row level security.

- **Accounts** — Supabase Auth, email and password
- **`public.deliveries`** — logged deliveries; a signed-in user can read, add and delete only their own
- **`public.trials`** — one row per user: `plan` and `started_at`; owner-readable, insert-once, never changed, start time set by the database
- **`public.owners`** — accounts that get everything free; only the project admin can add rows

The cost model, the current offer, the session start and the Active switch are remembered on the device.
