# Fare Bar

A slim fare bar app for delivery drivers. It is a single `index.html` with no build step.

## Screens

- **Home** — the fare bar, plus buttons for Configuration, Control Centre and Subscription
- **Configuration** — type the fare, miles, minutes and your minimum per mile
- **Control Centre** — steps to add an iPhone Control Centre button that opens the app, and a button to copy the app link
- **Subscription** — Pro and Unlimited plans, each with a 30-day free trial. Prices are samples and payments are not connected: the trial is only remembered on the device and nothing is charged when it ends

## Maths

- **Per mile** = fare ÷ (miles × 1.5) — the extra half covers the return trip
- **Per hour** = fare ÷ minutes × 60
- **ACCEPT / REJECT** — accept when per mile is at or above your minimum (default £1.50)

Your numbers are remembered on the device.
