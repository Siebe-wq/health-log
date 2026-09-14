# Daily log

A daily symptom log for one person, one phone. No build step, no server, no
accounts, no network calls. Everything lives in the browser on the device.

Open it, and the last evening's screen is already filled in at baseline. A day
where nothing is off baseline takes three taps: open, **Save day**, done.

## Files

| File | What it is |
|---|---|
| `index.html` | The page. Shell only. |
| `app.js` | All the logic and all the screens. |
| `styles.css` | Colours and sizes from the build brief. |
| `manifest.json` | Makes it installable on the home screen. |
| `sw.js` | Service worker. Caches the app so it opens offline. |
| `icons/` | Home screen icons. |

## Putting it on the phone

1. In GitHub, go to **Settings → Pages**.
2. Under *Build and deployment*, set **Source** to *Deploy from a branch*,
   pick the branch this code is on, folder `/ (root)`, and press Save.
3. Wait a minute, then open the URL Pages gives you in Chrome on the phone.
4. Chrome menu → **Add to Home screen**.
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

A new build does not replace a running one mid-entry. It waits until every tab
is closed, or until you tap **new build ready · load it** in the corner.

## Design rules, on purpose

- Dark, low-glare. No white anywhere, no bright surfaces.
- Touch targets at least 46px.
- No animation, no transitions, no confirmation dialogs.
- One scrolling column, 460px max, system font.
- A dot after a label means that value is off baseline. A dashed outline in a
  row marks where the baseline sits.

## Not in this version

Welltory HRV import, Garmin daily CSV import, charts. Entry has to be solid
first.
