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
into one dim line further down, still tappable to edit. Underneath is a strip
of the last seven days, one column each, height being how many items were off
baseline, and crash days in the warning colour. At the bottom is how long ago
you last downloaded a backup.

**Evening** and **Morning** are not permanent tabs. You reach them from Home,
and the tab appears only while you are on one, so there is a way back.

**History** is the full list of days, plus the backup buttons.

**Baseline** is your normal value for each of the 21 items.

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

## Design rules, on purpose

- Dark, low-glare. No white anywhere, no bright surfaces.
- Touch targets at least 46px.
- No animation, no transitions, no confirmation dialogs.
- One scrolling column, 460px max, system font.
- A dot after a label means that value is off baseline. The dashed outline in
  a row marks the baseline, whether or not it is the value you picked.

## Not in this version

Welltory HRV import, Garmin daily CSV import, charts. Entry has to be solid
first.
