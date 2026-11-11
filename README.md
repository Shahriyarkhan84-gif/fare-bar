# Fare Bar

A slim fare bar app for delivery drivers. It is a single `index.html` with no build step.

## First run

1. **Log in** — create an account or log in with email and password (Supabase Auth)
2. **Choose a plan** — start a 30-day free trial of Pro or Unlimited

After that the app opens on Home. Log out returns to step 1.

## Backend

Supabase project `fare-bar` (eu-west-2).

- **Accounts** — Supabase Auth, email and password
- **`public.trials`** — one row per user: `plan` and `started_at`. Row level security lets a signed-in user read and create only their own row; rows cannot be changed or deleted, and the start time is set by the database
- The page ships the project URL and the **publishable** key only

Payments are not connected: nothing is charged when a trial ends.

## Sending an order to the bar

Open the app with the numbers in the link and the bar fills itself:

`?fare=3.07&miles=1&mins=7.5`

An iPhone Shortcut can build this link, so the bar can be filled without typing. The app cannot read other apps by itself.

## Screens

- **Home** — the fare bar, plus buttons for Configuration, Control Centre and Subscription
- **Configuration** — type the fare, miles, minutes and your minimum per mile
- **Control Centre** — steps to add an iPhone Control Centre button that opens the app, and a button to copy the app link
- **Subscription** — Pro and Unlimited plans, each with a 30-day free trial saved to the account. Prices are samples and payments are not connected

## Maths

- **Per mile** = fare ÷ (miles × 1.5) — the extra half covers the return trip
- **Per hour** = fare ÷ minutes × 60
- **ACCEPT / REJECT** — accept when per mile is at or above your minimum (default £1.50)

Your fare numbers are remembered on the device.
