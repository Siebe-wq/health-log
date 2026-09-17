# Daily log

A daily symptom log for one person, one phone. No build step, no server, no
accounts, no network calls. Everything lives in the browser on the device.

Open it and the Home screen says what is still to log. A day where nothing is
off baseline takes one tap: **Nothing off baseline — save it**.

## Files

| File | What it is |
|---|---|
| `index.html` | The page. Shell only. |
| `app.js` | All the logic and all the screens. |
| `styles.css` | Colours and sizes from the build brief. |
| `manifest.json` | Makes it installable on the home screen. |
| `sw.js` | Service worker. Caches the app so it opens offline. |
| `icons/` | Home screen icons. |

## The screens

**Home** is a dashboard. It shows only what still needs logging: a card for the
evening, a card for the night that just ended. Before mid-afternoon the night
comes first; after that the evening does. Anything already logged collapses
into one dim line further down, still tappable to edit.

Under that are two numbers — the **week score** (how it has been) and the
**PEM predictor** (what the next day or two are exposed to) — and a seven day
grid of sleep, PEM, symptoms above baseline and demand above it. At the bottom is how
long ago you last downloaded a backup.

**Pot** is the reward tab, reached from Home like Evening and Morning.

The **Evening** card only appears from 21:00. Before then Home offers a quiet
line instead, so the screen is still one tap away — a card that only existed
after nine would leave no route in at four in the afternoon. The one-tap
"nothing off baseline" save lives on that card, so it waits for the evening
too. The hour is `EVENING_FROM_HOUR` at the top of the home section.

**Evening** and **Morning** are not permanent tabs. You reach them from Home,
and the tab appears only while you are on one, so there is a way back.

**History** is the full list of days, plus the backup buttons.

**Baseline** is the setup screen: your normal value for each item, the hours of
sleep you normally need, what is tracked at all, and what the rewards pay.

## Putting it on the phone

1. In GitHub, go to **Settings → Pages**.
2. Under *Build and deployment*, set **Source** to *Deploy from a branch*,
   pick the branch this code is on, folder `/ (root)`, and press Save.
3. Wait a minute, then open the URL Pages gives you in Chrome on the phone.
4. Browser menu → **Add to Home screen** (works in Firefox and Chrome).
5. Open it from the home screen icon once while online, so the service worker
   can cache everything. After that it opens with no signal.

## Where the data is

In `localStorage`, under the key `sr-daily-log-v1`, as one JSON object:

```
{ version: 2, baselines: { tired: 2, ... }, days: { "2026-09-14": { ... } } }
```

One record per day. A night belongs to the evening date: the Tuesday evening
entry and the Wednesday morning entry are the same record, labelled Tuesday.

Every tap saves straight away. **Save day** only marks the day complete — days
touched but not saved show as drafts in History.

## Backups

Browser storage gets wiped eventually, by a Chrome cleanup, a reinstall, or a
tap in the wrong settings screen. So:

- **Download JSON** in History writes the whole dataset, baselines included,
  to a file. Do this now and then and keep the file somewhere else.
- **Restore from a JSON file** reads one back. It merges: a day already on the
  phone is only replaced if the file's copy is newer. Restoring an old backup
  never destroys newer entries, so it is safe to press.
- **Download CSV** writes the long format that matches the Visible exports, so
  old and new data can be stacked in one file:
  `observation_date,tracker_name,tracker_category,observation_value,baseline`
- **Copy JSON to clipboard** is there for when a download is awkward.

## Changing the app

Edit the files and push. Two things must be bumped together on every change:

1. `VERSION` at the top of `app.js` — this is the number in the bottom corner.
2. `CACHE` at the top of `sw.js` — same string.

If `CACHE` is not bumped, the phone keeps serving the old build from its cache
and the version number in the corner will tell you so.

### How a new build reaches the phone

GitHub Pages takes about a minute to publish after a push. After that:

- Open the app with a connection. It loads instantly from cache, checks for a
  new build in the background, and if you have not touched anything yet it
  swaps itself in and reloads on its own. That takes a few seconds. The version
  number in the corner is how you confirm it happened.
- If you are already entering a day, nothing moves. A line appears in the
  corner — **new build ready · load it** — and it waits for you.
- Opened with no signal, it stays on the build it has. It updates the next time
  you open it online.

So: yes, it updates itself, but only when opened online, and never mid-entry.

## Today does not count until the evening is submitted

A day in progress is not a reading. Until Save day is pressed, today is left
out of both scores, both panels, the chart, the pacing row and the strips — its
column is simply empty.

Without that, a few items tapped in the afternoon would feed the numbers, and
today carries the heaviest weight of any day in the PEM predictor's window. A
heavy but unfinished day could push the predictor hard on the strength of three
taps. Every backward-looking view reads days through one function,
`settledEntry`, so there is one place where this holds.

Two things are deliberately **not** gated. The pot pays a win the moment you
log it. History still lists today as a draft, since that is what History is
for.

## The score panels

Tapping either number on Home opens its own panel: the score over the last
fourteen days, and what is behind the current figure.

The breakdown is **exact, not an illustration**. Both scores are a weighted
mean of daily burdens, and each daily burden is a plain mean over the items
counted that day, which decomposes: an item's share is the same weighted mean
of its own burden divided by the number of items counted alongside it. Those
shares sum to the burden the score is built from — verified to nine decimal
places by a test, not by eye. The only gap you will see on screen is the
rounding of the score itself to a whole number.

Each row carries the last seven days of what you actually entered, newest on
the right, coloured the same way the rest of the app colours that item. Sleep
hours has its own row showing the hours themselves, coloured by how far short
of target each night fell. Items sitting at or better than baseline are named
in one line at the bottom rather than given rows of their own.

Both scores and both panels read their item lists from one function each —
`loadParts` and `scoreParts` — so the number on Home and the breakdown that
explains it cannot disagree about what counted.

The panel's day weights are derived from the same half life the score uses
rather than copied, so the two cannot drift apart.

## What is tracked is a setting

The Baseline screen has a **What to track** section. Every item can be hidden,
and you can add your own.

- **Hiding** stops an item being asked for and stops it counting toward the
  scores. Everything already recorded is kept and still exports — the CSV walks
  every key ever defined, not just the ones on screen today.
- **Adding your own** takes a name, a scale (0-3 or no/yes) and where it
  belongs: Symptoms, Exertion or Night. It then behaves like any other item —
  it gets a baseline, joins the matching score, appears in the chart picker and
  exports under its own name. Removing one keeps its history in the export.

Both scores are an average across the items tracked, **so hiding or adding one
changes what the number is an average of.** Scores from before a change are not
strictly comparable with scores after it. That is the honest cost of making it
adjustable, and the screen says so.

The floors bend with it. The week score needs half the tracked symptom items
up to a maximum of eight, rather than a fixed eight, so hiding a handful cannot
silently switch a score off for good.

Everything downstream reads one registry, rebuilt by `rebuildItems()` whenever
the setup changes, so there is a single place that decides what exists.

## The pot

Two things pay, and both are things worth reinforcing rather than things that
happen to you. The amounts start at €0.20 a thing done well, €0.25 for a day
paced at 1 and €0.50 for a day paced at 0, and all three are editable in the
Rewards section of the Baseline screen — as is whether there is any money at
all.

The pot is **worked out from the log rather than banked**, so changing an
amount re-prices every day already recorded. With the money switched off, wins
are still logged and still counted; the tab becomes Wins and shows the count.

**Did something well** on Home logs one with a single tap. The text is optional
and comes after the tap, never before it, so a bad day still gets the tap.
Nothing blocks, and the last one can be removed if it was a mis-tap.

A day only pays for pacing you actually stood behind — the same rule the scores
use. Every record starts pre-filled at baseline, and pacing's baseline is 1, so
without that rule a day you never really logged would quietly earn €0.25.

Amounts are written as `€0.20` rather than `€ 0,20`. Say the word if you would
rather have the Dutch format.

Wins export as `Done well` rows, one per win, carrying the text.

## The week score

One number, 0-100, for the last seven days. **100 is a day at your normal.** It
is measured against your own baselines, so it says nothing about how you
compare with a healthy person — only how this week sat against your usual.

How it is built:

- Each item's distance the wrong side of its baseline becomes 0 to 1, where 1
  is as bad as that item goes. Being better than baseline counts as 0, never
  as credit.
- Sleep is inverted, because on that scale 3 is a good night.
- The day's burden is the mean across items, and the day score is
  `100 × (1 − burden)`.
- The week weights recent days more, with a three day half life: today counts
  1, three days back a half, six days back a quarter. Days with no entry are
  skipped and the weights renormalised.

What it deliberately leaves out:

- The five *what the day asked of you* items. Being physically active is a
  cause, not a symptom.
- Today, until you press Save day. See below.
- Values you have not stood behind. Every record starts pre-filled at baseline,
  so a night you never logged would otherwise count as a normal night and
  flatter the score. An item counts once you move it yourself, or once you
  press Save day (evening items) or finish the morning (night items).
- Days with fewer than 8 items entered, and weeks with fewer than 3 days.

Its main limitation: every item counts the same, so a crash weighs exactly as
much as mild constipation. If that turns out to matter, the fix is per-item
weights in `itemBurden`.

## PEM predictor

The forward-looking number. It runs the **opposite way to the week score**: a
high number is a warning, not a good sign. The band word next to it always says
which way it points — low, raised, high.

### Two axes, which are easy to confuse

- **Six items, within a day.** The five demand items — physically active,
  mentally demanding, socially demanding, emotionally stressful, pacing — plus
  sleep quality. Each becomes a 0 to 1 burden the same way the week score does,
  and the six are averaged into one burden for that day.
- **Four days, across the window.** Those day burdens are then weighted and
  combined.

So: six items make a day, four days make the score.

Pacing counts as demand because its scale is "low = better", so a high value is
a day you pushed through rather than paced. Sleep runs the other way and the
burden function already knows it.

**Sleep appears in both numbers on purpose.** In the week score it is a
symptom, part of how the week went. Here it is a risk factor: a bad night
leaves less to spend the next day. Same reading, two jobs.

### The day weights

PEM is delayed, typically by 12 to 48 hours, and it stacks: several ordinary
days in a row can do what no single day would. So today and yesterday carry
full weight — their PEM is still in flight — and the two days before taper off,
because their effect has largely already arrived:

```
today 1 · yesterday 1 · 2 days back 0.6 · 3 days back 0.3
```

The same heavy day therefore costs about three times as much when it is today
as when it is three days back.

Date keying does the right thing here without special handling. A night belongs
to the evening date, so tonight's sleep sits on today's record and has not
happened yet — and the "values you stand behind" rule leaves it out until you
log the morning.

### What it says

If the number is up and the last two days still score well, the cost has not
landed yet and the next day or two are the exposed part. If the number is up
and symptoms are already down, it has landed.

**The weights are a rule of thumb, not a measured curve.** There is no
validated formula for predicting PEM from self-reported exertion. The nearest
research idea is Leonard Jason's energy envelope work, which is correlational
and small. The name says predictor; read it as a prompt to think.

## Mood

Five points with neutral in the middle: happy, good, neutral, meh, bad. It is
the one genuinely two-sided scale in the app, so it gets a diverging ramp —
green out to happy, orange and red out to bad — with intensity growing away
from the middle in both directions rather than only upwards.

It was four points in v1.8.0 (happy, ok, meh, bad). Inserting neutral shifted
the meaning of 2 and 3, so the store carries a migration: anything written
before store version 3 has mood 2 bumped to 3 and 3 bumped to 4, in day
records and in the baseline. Restored backups go through the same step.
Without it, a day logged as bad would quietly redisplay as meh.

## Post-dinner indigestion

Until v1.6.0 this was "stomach at bedtime", a four way pick of none / normal /
heavy / odd. It is now a 0-3 rating like every other symptom, which means it
gets a baseline, counts toward the symptom score, and exports with a number.

The old values are **not converted** — "odd" is not a point on a severity scale
and guessing one would be inventing data. Records from before the change keep
their `stomach` value and still export it as `Stomach at bedtime`. New records
use `Post-dinner indigestion`. Its baseline starts at 0; set your own on the
Baseline screen.

## Hours slept

Recorded on the Morning screen with half hour steps, so it needs no keyboard in
the dark, and the field still takes a typed number.

It feeds the PEM predictor as **its own item, with the same weight as every
other one**. Quality and hours are two readings of the same night, so between
them sleep carries two of the seven slots on a night you log both — that is
deliberate. Leaving hours blank costs nothing: the day is then scored over the
six items it does have.

The reference is **hours you normally need**, set at the bottom of the Baseline
screen and starting at 8. Only sleeping short of it counts:

```
burden = (target − hours) / target, clamped to 0..1
```

Sleeping longer than target scores 0 rather than earning credit, the same as
every other item. Nothing penalises a long night, which in ME/CFS can mean
either recovery or a crash — the app does not pretend to know which.

It exports as `Sleep hours`. The 0-3 rating still exports as `Sleep`, the name
your Visible history uses, even though the screen labels it Sleep quality.

## Notifications

There are none, and there cannot be without changing what this app is.

A web app can only be pushed to by a **server** sending the push — the phone
subscribes, and something has to be at the other end. This app has no server
and makes no network calls, which is the point of it.

The one API that would have allowed a purely local scheduled notification,
Notification Triggers (`showTrigger` with a `TimestampTrigger`), ran as a
Chrome origin trial twice and was then **abandoned**. It never shipped, and
nothing replaced it. A notification can only be raised while the page is
actually open, which is no use as a reminder.

Web Push itself does work in Firefox on Android for an installed app, so if a
tiny server ever became acceptable it is buildable. Until then the phone's own
alarm or a repeating calendar entry does the job, needs no code, and fires
without a signal.

## Design rules, on purpose

- Dark, low-glare. No white anywhere, no bright surfaces.
- Touch targets at least 46px.
- No animation, no transitions, no confirmation dialogs.
- One scrolling column, 460px max, system font.
- The Evening screen is split by three large headers — Symptoms, Exertion,
  Bedtime and notes — so what happened to you and what you asked of yourself
  are never read as one list. The old group headers stay as small subtitles
  under them.
- Severity reads as heat: nothing, yellow, orange, red. Yellow through orange
  to red is the one multi-hue ramp that is not a rainbow — the hues carry the
  meaning. Every filled step takes dark ink at 4.9:1 or better.
- On a no/yes item, yes takes the severe end of the ramp. A crash drawn in the
  mildest colour would read as a small thing.
- A dot after a label means that value is off baseline. The dashed outline in
  a row marks the baseline, whether or not it is the value you picked.
- On the dashboard, colour is distance from your baseline, not the raw value:
  green better, grey at it, then the same yellow-orange-red heat for one, two,
  three or more steps worse. Every cell prints its number, so the colour never
  carries the value on its own.
- The chart's two lines were checked for colourblind separation rather than
  guessed: worst pair ΔE 17.6 under protanopia against a floor of 8. They sit
  slightly outside the standard categorical lightness and chroma bands on
  purpose — hitting those bands means a more saturated, brighter line, which
  this screen cannot have.
- Sleep gets a valenced ramp of its own on the entry screen, because 3 is a
  good night there while 3 means worst on every other row.

## Not in this version

Welltory HRV import, Garmin daily CSV import, charts. Entry has to be solid
first.
