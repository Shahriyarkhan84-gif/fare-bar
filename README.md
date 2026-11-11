# Fare Bar

A slim fare bar app for delivery drivers. It is a single `index.html` with no build step.

## First run

1. **Log in** — email login is switched off until accounts are connected; "Continue on this phone only" lets you in
2. **Choose a plan** — start a 30-day free trial of Pro or Unlimited

After that the app opens on Home. Log out returns to step 1.

## Sending an order to the bar

Open the app with the numbers in the link and the bar fills itself:

`?fare=3.07&miles=1&mins=7.5`

An iPhone Shortcut can build this link, so the bar can be filled without typing. The app cannot read other apps by itself.

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
