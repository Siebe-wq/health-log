/* Daily log — vanilla JS, no build step, no network.
   When you change anything here, bump VERSION below AND the cache name at the
   top of sw.js. The version in the corner is how you check a new build loaded. */

var VERSION = "v1.5.0";
var STORE_KEY = "sr-daily-log-v1";
var STORE_VERSION = 2;

/* ---------- scales ---------- */

var RAMP4 = ["#2B333C", "#5C4A2C", "#8A6A31", "#C08A4B"];
var RAMP6 = ["#2B333C", "#4A4030", "#6B5730", "#8C6E33", "#AA7E3E", "#C9884A"];

/* Sleep runs the other way to everything else: 3 is a good night. It gets a
   valenced ramp so a good night is never painted in the alarm colour. */
var SLEEP_RAMP = ["#C4704F", "#7A4436", "#454F5C", "#53946A"];

/* Green / grey / red against your own baseline. Two steps each side, widely
   separated: a mid red sits in a contrast valley where neither text colour
   clears 4.5:1. Every cell prints its value, so the colour is never the only
   thing carrying the number. */
var VAL = {
  good2: "#53946A",   /* two or more better than baseline */
  good1: "#35604A",
  same:  "#454F5C",
  bad1:  "#7A4436",
  bad2:  "#C4704F",   /* two or more worse */
  none:  "transparent"
};
/* Whichever of the two text colours actually reads on each fill. */
var INK = {
  "#53946A": "#14181C", "#35604A": "#C6CED6", "#454F5C": "#C6CED6",
  "#7A4436": "#C6CED6", "#C4704F": "#14181C", "#C08A4B": "#14181C"
};

function valenceFill(delta) {
  if (delta === null || delta === undefined) return VAL.none;
  if (delta <= -2) return VAL.good2;
  if (delta === -1) return VAL.good1;
  if (delta === 0) return VAL.same;
  if (delta === 1) return VAL.bad1;
  return VAL.bad2;
}

/* ---------- items ---------- */

var EVENING_SECTIONS = [
  { title: "Energy", items: [
    { key: "tired", label: "Feeling tired / sluggish" },
    { key: "pem", label: "PEM" },
    { key: "crash", label: "Crash", max: 1, labels: ["no", "yes"] }
  ]},
  { title: "Brain", items: [
    { key: "brainFog", label: "Brain fog" },
    { key: "headache", label: "Headache" },
    { key: "noise", label: "Noise sensitivity" }
  ]},
  { title: "Body", items: [
    { key: "muscleAches", label: "Muscle aches" },
    { key: "muscleWeakness", label: "Muscle weakness" },
    { key: "breath", label: "Shortness of breath" },
    { key: "soreThroat", label: "Sore throat" },
    { key: "sweating", label: "Sweating / thermal dysregulation" },
    { key: "hyper", label: "Hyper / sympathetic overdrive" }
  ]},
  { title: "Gut", items: [
    { key: "constipation", label: "Constipation" },
    { key: "diarrhea", label: "Diarrhea" }
  ]},
  { title: "What the day asked of you", items: [
    { key: "physical", label: "Physically active" },
    { key: "mental", label: "Mentally demanding" },
    { key: "social", label: "Socially demanding" },
    { key: "emotional", label: "Emotionally stressful" },
    { key: "pacing", label: "Pacing (low = better)" }
  ]}
];

var MORNING_ITEMS = [
  { key: "sleep", label: "Sleep quality", ramp: SLEEP_RAMP, higherIsBetter: true },
  { key: "episode", label: "Dysautonomic episode", max: 5, ramp: RAMP6 },
  { key: "syncope", label: "Near-syncope", max: 1, labels: ["no", "yes"] }
];

var EVENING_ITEMS = [];
EVENING_SECTIONS.forEach(function (s) { EVENING_ITEMS = EVENING_ITEMS.concat(s.items); });
var ALL_ITEMS = EVENING_ITEMS.concat(MORNING_ITEMS);
var ITEM_BY_KEY = {};
ALL_ITEMS.forEach(function (i) { ITEM_BY_KEY[i.key] = i; });
var EVENING_KEYS = EVENING_ITEMS.map(function (i) { return i.key; });
var ALL_KEYS = ALL_ITEMS.map(function (i) { return i.key; });

var DEFAULT_BASELINES = {
  tired: 2, pem: 1, crash: 0, brainFog: 2, headache: 0, noise: 2,
  muscleAches: 1, muscleWeakness: 2, breath: 1, soreThroat: 0,
  sweating: 0, hyper: 1, constipation: 0, diarrhea: 0,
  physical: 1, mental: 1, social: 1, emotional: 0, pacing: 1,
  sleep: 2, episode: 0, syncope: 0
};

var TAGS = ["episode", "visitor", "extra med", "bad night", "GI", "heat", "appointment"];
var STOMACH = ["none", "normal", "heavy", "odd"];

/* ---------- export naming (matches the Visible CSV) ---------- */

var EXPORT_NAME = {
  tired: "Feeling tired/sluggish", pem: "Post-exertional malaise",
  crash: "Crash", brainFog: "Brain Fog",
  headache: "Headache", noise: "Noise sensitivity", muscleAches: "Muscle aches",
  muscleWeakness: "Muscle weakness", breath: "Shortness of breath",
  soreThroat: "Sore throat", sweating: "Sweating & thermal dysregulation",
  hyper: "Hyper/sympathetic overdrive", constipation: "Constipation",
  diarrhea: "Diarrhea", physical: "Physically active", mental: "Mentally demanding",
  social: "Socially demanding", emotional: "Emotionally stressful",
  pacing: "Pacing (low = better)", sleep: "Sleep",
  episode: "Dysautonomic episode (0-5)", syncope: "Near-syncope",
  lastBite: "Time of last bite", stomach: "Stomach at bedtime",
  sleepHours: "Sleep hours"
};

var CATEGORY = {
  tired: "General", pem: "General", crash: "Experience",
  brainFog: "Brain", headache: "Brain",
  noise: "Sensory", muscleAches: "Muscles", muscleWeakness: "Muscles",
  breath: "Heart and Lungs", soreThroat: "Pain", sweating: "Custom",
  hyper: "Custom", constipation: "Gastrointestinal", diarrhea: "Gastrointestinal",
  physical: "Physical", mental: "Cognitive", social: "Social",
  emotional: "Emotional", pacing: "Custom", sleep: "Sleep",
  episode: "Custom", syncope: "Custom", lastBite: "Custom", stomach: "Custom",
  sleepHours: "Sleep"
};

/* ---------- dates ---------- */

function iso(d) {
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}
function today() { return iso(new Date()); }
function shiftDay(dateStr, n) {
  var p = dateStr.split("-").map(Number);
  return iso(new Date(p[0], p[1] - 1, p[2] + n));
}
var DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/* Written out by hand: toLocaleDateString gives "Mon, 14 Sept", which is
   noisier than it needs to be at night. */
function pretty(dateStr) {
  var p = dateStr.split("-").map(Number);
  var d = new Date(p[0], p[1] - 1, p[2]);
  return DAY_NAMES[d.getDay()] + " " + d.getDate() + " " + MONTH_NAMES[d.getMonth()];
}
function relativeWord(dateStr) {
  var t = today();
  if (dateStr === t) return "today";
  if (dateStr === shiftDay(t, -1)) return "yesterday";
  if (dateStr === shiftDay(t, 1)) return "tomorrow";
  return "";
}

/* ---------- storage ---------- */

var state = {
  days: {},
  baselines: Object.assign({}, DEFAULT_BASELINES),
  tab: "home",
  eveDate: today(),
  mornDate: shiftDay(today(), -1),
  storeOk: true,
  storeMsg: "",
  lastBackupAt: null
};

function loadStore() {
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    var parsed = JSON.parse(raw);
    state.days = parsed.days || {};
    state.baselines = Object.assign({}, DEFAULT_BASELINES, parsed.baselines || {});
    state.lastBackupAt = parsed.lastBackupAt || null;
  } catch (e) {
    state.storeOk = false;
    state.storeMsg = "read: " + (e && e.message ? e.message : String(e));
  }
}

var saveTimer = null;
function saveNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      version: STORE_VERSION, days: state.days, baselines: state.baselines,
      lastBackupAt: state.lastBackupAt
    }));
    if (!state.storeOk) { state.storeOk = true; state.storeMsg = ""; renderBanner(); }
    flash("Saved");
  } catch (e) {
    state.storeOk = false;
    state.storeMsg = "write: " + (e && e.message ? e.message : String(e));
    renderBanner();
    flash("Not saved");
  }
}
function saveSoon(ms) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, ms === undefined ? 400 : ms);
}

var flashTimer = null;
function flash(text) {
  var el = document.getElementById("status");
  el.textContent = text;
  el.style.color = state.storeOk ? "var(--dim)" : "var(--warn)";
  if (flashTimer) clearTimeout(flashTimer);
  flashTimer = setTimeout(function () { el.textContent = ""; }, 1500);
}

/* ---------- entries ---------- */

function emptyEntry(date) {
  return {
    date: date, v: Object.assign({}, state.baselines), touched: {},
    lastBite: "", stomach: "", sleepHours: "", tags: [], note: "", nightNote: "",
    complete: false, morningDone: false, savedAt: null, updatedAt: null
  };
}
/* Read-only view of a day. Days that do not exist yet read as baseline. */
function getEntry(date) {
  return state.days[date] || emptyEntry(date);
}
/* Write path: creates the day if it is not there yet. */
function update(date, fn) {
  var e = state.days[date];
  if (!e) { e = emptyEntry(date); state.days[date] = e; }
  fn(e);
  e.updatedAt = new Date().toISOString();
  return e;
}
function offBaselineKeys(entry, keys) {
  return keys.filter(function (k) {
    return entry.v[k] !== undefined && entry.v[k] !== state.baselines[k];
  });
}

/* ---------- tiny DOM helpers ---------- */

function el(tag, props, kids) {
  var n = document.createElement(tag);
  if (props) Object.keys(props).forEach(function (k) {
    if (k === "class") n.className = props[k];
    else if (k === "text") n.textContent = props[k];
    else if (k === "html") n.innerHTML = props[k];
    else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), props[k]);
    else if (k === "style") Object.assign(n.style, props[k]);
    else n.setAttribute(k, props[k]);
  });
  (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
  return n;
}
function section(title, kids) {
  return el("div", { class: "section" },
    [title ? el("h2", { class: "section-head", text: title }) : null].concat(kids || []));
}

/* ---------- rating row ---------- */

/* item: {key,label,max,labels,ramp}
   getValue/setValue work on whatever record the screen is editing.
   baselineOf returns the marked baseline, or undefined on the Baseline screen. */
function ratingRow(item, getValue, setValue, baselineOf, onAfter) {
  var max = item.max === undefined ? 3 : item.max;
  var ramp = item.ramp || RAMP4;
  var dot = el("span", { class: "dot", text: "●" });
  var label = el("div", { class: "label" }, [
    el("span", { text: item.label }), dot
  ]);
  var opts = el("div", { class: "opts" });
  var buttons = [];
  for (var n = 0; n <= max; n++) {
    (function (n) {
      var b = el("button", {
        type: "button",
        "aria-pressed": "false",
        text: item.labels ? item.labels[n] : String(n),
        onclick: function () { setValue(n); refresh(); if (onAfter) onAfter(); }
      });
      buttons.push(b);
      opts.appendChild(b);
    })(n);
  }
  function refresh() {
    var value = getValue();
    var base = baselineOf ? baselineOf() : undefined;
    buttons.forEach(function (b, n) {
      var on = value === n;
      var isBase = base === n;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.setAttribute("data-baseline", isBase ? "1" : "0");
      var fill = ramp[Math.min(n, ramp.length - 1)];
      /* The warm ramps go dark-on-fill from step 2 up. A valenced ramp is not
         monotone in lightness, so it says which ink it takes. */
      b.setAttribute("data-dark", (INK[fill] || (n >= 2 ? "#14181C" : "")) === "#14181C" ? "1" : "0");
      b.style.background = on ? fill : "";
      /* The baseline keeps its dashed outline even while it is the value you
         picked, so normal is always visible. On a filled button the dash is
         drawn in that button's own text colour. */
      b.style.borderColor = isBase
        ? (on ? (b.getAttribute("data-dark") === "1" ? "#14181C" : "var(--text)") : "var(--dim)")
        : (on ? fill : "");
    });
    var off = base !== undefined && value !== undefined && value !== base;
    dot.style.display = off ? "" : "none";
    if (off) {
      /* The dot says which way it went, not just that it moved. */
      var worse = item.higherIsBetter ? value < base : value > base;
      dot.style.color = worse ? "var(--accent)" : "#6FAF87";
    }
  }
  refresh();
  return { el: el("div", { class: "row" }, [label, opts]), refresh: refresh };
}

/* ---------- date navigation ---------- */

function dateNav(getDate, setDate, caption) {
  var cap = el("div", { class: "caption" });
  function paint() { cap.innerHTML = ""; caption(cap); }
  paint();
  return el("div", { class: "datenav" }, [
    el("button", { type: "button", "aria-label": "Previous day", text: "‹",
      onclick: function () { setDate(shiftDay(getDate(), -1)); } }),
    cap,
    el("button", { type: "button", "aria-label": "Next day", text: "›",
      onclick: function () { setDate(shiftDay(getDate(), 1)); } })
  ]);
}

/* ---------- scoring ---------- */

/* The score is about how you were, not what the day asked of you. Being
   physically active is a cause, not a symptom, so those five items are left
   out of it. */
var LOAD_KEYS = ["physical", "mental", "social", "emotional", "pacing"];
var SCORE_ITEMS = ALL_ITEMS.filter(function (i) { return LOAD_KEYS.indexOf(i.key) < 0; });

/* How far one item sits the wrong side of its baseline, as 0..1.
   0 = at your normal or better. 1 = as bad as that item goes. */
function itemBurden(item, value, base) {
  if (value === undefined || base === undefined) return null;
  var max = item.max === undefined ? 3 : item.max;
  var headroom = item.higherIsBetter ? base : max - base;
  if (headroom <= 0) return null;            /* no room to get worse: no signal */
  var worse = item.higherIsBetter ? base - value : value - base;
  return Math.max(0, Math.min(1, worse / headroom));
}

/* Does this item on this day carry a value you actually stand behind?

   Every record is created pre-filled at baseline, so a value being present
   means nothing on its own — a night you never logged would otherwise count
   as a normal night and quietly flatter the score. It counts if you moved it
   yourself, or if you pressed Save day (evening items) or finished the
   morning (night items), which is where leaving something at baseline becomes
   a statement that it was normal. */
var MORNING_KEYS = MORNING_ITEMS.map(function (i) { return i.key; });

function itemCounts(entry, key) {
  if (entry.touched && entry.touched[key]) return true;
  if (MORNING_KEYS.indexOf(key) >= 0) return nightIsLogged(entry);
  return !!entry.complete;
}

/* A day part way through entry says almost nothing. One item tapped at its
   worst would otherwise read as a score of 0. Half the items is the floor for
   a day to count at all; pressing Save day clears it comfortably. */
var MIN_SCORED = 8;

/* Mean burden across the items that day actually stands behind. */
function dayBurden(entry) {
  if (!entry) return null;
  var sum = 0, n = 0;
  SCORE_ITEMS.forEach(function (it) {
    if (!itemCounts(entry, it.key)) return;
    var b = itemBurden(it, entry.v[it.key], state.baselines[it.key]);
    if (b !== null) { sum += b; n++; }
  });
  return n < MIN_SCORED ? null : sum / n;
}

function dayScore(entry) {
  var b = dayBurden(entry);
  return b === null ? null : Math.round(100 * (1 - b));
}

/* ---------- room left: the forward-looking half ---------- */

/* Six inputs: the five demand items the week score leaves out, plus sleep
   quality. All the demand items read higher = more demand, pacing included —
   its label is "low = better", so a high value is a day you pushed through
   rather than paced. Sleep runs the other way and itemBurden already knows it.

   Sleep is in both numbers on purpose. In the week score it is a symptom, part
   of how the week went. Here it is a risk factor: a bad night leaves less to
   spend the next day. Same reading, two jobs.

   Note the two axes, which are easy to confuse: these six items are averaged
   into one burden for a day, and then four DAYS of that burden are weighted
   below. Six items, four days. */
var DEMAND_ITEMS = ALL_ITEMS.filter(function (i) { return LOAD_KEYS.indexOf(i.key) >= 0; });
var LOAD_ITEMS = DEMAND_ITEMS.concat([ITEM_BY_KEY.sleep]);
var MIN_LOAD_ITEMS = 3;

function loadBurden(entry) {
  if (!entry) return null;
  var sum = 0, n = 0;
  LOAD_ITEMS.forEach(function (it) {
    if (!itemCounts(entry, it.key)) return;
    var b = itemBurden(it, entry.v[it.key], state.baselines[it.key]);
    if (b !== null) { sum += b; n++; }
  });
  return n < MIN_LOAD_ITEMS ? null : sum / n;
}

/* Exertion that has not landed yet.

   PEM is delayed, typically by 12 to 48 hours, and it stacks: several ordinary
   days in a row can do what no single day would. So today and yesterday carry
   full weight — their PEM is still in flight — and the two days before that
   taper off as their effect has largely already arrived.

   These weights are a rule of thumb, not a measured curve. There is no
   validated formula for predicting PEM from self-reported exertion; the
   closest research idea is Jason's energy envelope, which is correlational.
   Treat the number as a prompt to think, not a forecast. */
var LOAD_WEIGHTS = [1, 1, 0.6, 0.3];

/* Runs the opposite way to the week score: here a high number is a warning,
   not a good sign, because that is the only reading of "PEM predictor" that
   makes sense. The band word next to it always says which way it points. */
function pemRisk(endDate) {
  var sum = 0, weight = 0, days = 0;
  for (var i = 0; i < LOAD_WEIGHTS.length; i++) {
    var b = loadBurden(state.days[shiftDay(endDate, -i)]);
    if (b === null) continue;
    sum += LOAD_WEIGHTS[i] * b; weight += LOAD_WEIGHTS[i]; days++;
  }
  if (days < 2) return { risk: null, days: days };
  return { risk: Math.round(100 * (sum / weight)), days: days };
}

/* Has the cost already arrived, or is it still coming? */
function symptomsHoldingUp(endDate) {
  var scores = [];
  for (var i = 0; i < 2; i++) {
    var sc = dayScore(state.days[shiftDay(endDate, -i)]);
    if (sc !== null) scores.push(sc);
  }
  if (scores.length === 0) return null;
  return scores.reduce(function (a, b) { return a + b; }, 0) / scores.length >= 85;
}

/* Seven days ending at endDate, weighted by recency with a three day half
   life: today counts 1, three days back counts a half, six days back a
   quarter. Days with no entry are skipped and the weights renormalised.
   Under three days of data there is nothing worth averaging. */
function weekScore(endDate) {
  var sum = 0, weight = 0, days = 0;
  for (var i = 0; i < 7; i++) {
    var b = dayBurden(state.days[shiftDay(endDate, -i)]);
    if (b === null) continue;
    var w = Math.pow(0.5, i / 3);
    sum += w * b; weight += w; days++;
  }
  if (days < 3) return { score: null, days: days };
  return { score: Math.round(100 * (1 - sum / weight)), days: days };
}

/* ---------- home ---------- */

/* The night that just ended is logged under yesterday's date. */
function nightIsLogged(entry) {
  if (!entry) return false;
  if (entry.morningDone) return true;
  return !!(entry.touched.sleep || entry.touched.episode || entry.touched.syncope);
}

function openEvening(date) {
  state.eveDate = date; eveDateManual = true; state.tab = "evening"; render();
}
function openMorning(date) {
  state.mornDate = date; mornDateManual = true; state.tab = "morning"; render();
}

/* A job still to do: full size, accent edge. */
function dueCard(title, sub, onclick, extra) {
  return el("div", { class: "card due" }, [
    el("button", { class: "card-main", type: "button", onclick: onclick }, [
      el("div", { class: "card-title", text: title }),
      el("div", { class: "card-sub", text: sub })
    ])
  ].concat(extra ? [extra] : []));
}

/* Done for the day: one dim line, out of the way but still editable. */
function doneLine(text, onclick) {
  return el("button", { class: "card done", type: "button", onclick: onclick }, [
    el("div", { class: "line" }, [
      el("span", { text: text }),
      el("span", { class: "meta", text: "edit" })
    ])
  ]);
}

/* The week in one number, plus how it compares with the week before. */
function scoreTile() {
  var t = today();
  var now = weekScore(t);
  var box = el("div", { class: "score" });
  if (now.score === null) {
    box.appendChild(el("div", { class: "score-label", text: "Week score" }));
    box.appendChild(el("div", { class: "score-wait",
      text: now.days === 0 ? "Needs a few logged days" : "Needs 3 logged days, has " + now.days }));
    return box;
  }
  var band = now.score >= 85 ? ["#6FAF87", "at or near your normal"]
    : now.score >= 70 ? ["#C6CED6", "somewhat below your normal"]
    : ["#D08A6B", "well below your normal"];
  var head = el("div", { class: "score-head" }, [
    el("span", { class: "score-num", text: String(now.score) }),
    el("span", { class: "score-band", text: band[1] })
  ]);
  head.querySelector(".score-num").style.color = band[0];
  box.appendChild(el("div", { class: "score-label", text: "Week score" }));
  box.appendChild(head);

  var before = weekScore(shiftDay(t, -7));
  var line = "Against your own baseline, recent days weighted";
  if (before.score !== null) {
    var d = now.score - before.score;
    line = (d === 0 ? "Level with" : Math.abs(d) + " " + (d > 0 ? "better than" : "worse than")) +
      " the week before · " + line;
  }
  box.appendChild(el("div", { class: "score-cap", text: line }));
  return box;
}

/* What the next day or two are exposed to. */
function pemTile() {
  var t = today();
  var now = pemRisk(t);
  var box = el("div", { class: "score" });
  box.appendChild(el("div", { class: "score-label", text: "PEM predictor" }));
  if (now.risk === null) {
    box.appendChild(el("div", { class: "score-wait",
      text: "Needs 2 of the last 4 days, has " + now.days }));
    return box;
  }
  var band = now.risk <= 20 ? ["#6FAF87", "low"]
    : now.risk <= 40 ? ["#C6CED6", "raised"]
    : ["#D08A6B", "high"];
  var head = el("div", { class: "score-head" }, [
    el("span", { class: "score-num", text: String(now.risk) }),
    el("span", { class: "score-band", text: band[1] })
  ]);
  head.querySelector(".score-num").style.color = band[0];
  box.appendChild(head);

  var reading;
  if (now.risk <= 20) {
    reading = "The last few days asked no more of you than usual.";
  } else {
    var holding = symptomsHoldingUp(t);
    reading = holding === false
      ? "It is already showing in your symptoms."
      : "PEM usually lands 12 to 48 hours later — the next day or two are the exposed part.";
  }
  box.appendChild(el("div", { class: "score-cap",
    text: reading + " · 6 items over 4 days, a rule of thumb" }));
  return box;
}

/* Seven days, four rows: sleep, PEM, and how many items sat worse than
   baseline. Colour is the distance from your baseline, not the raw value, and
   every cell prints its number so the colour is never doing the work alone. */
function weekGrid() {
  var t = today();
  var rows = [
    { key: "sleep", label: "Sleep" },
    { key: "pem", label: "PEM" },
    { key: null, label: "Worse" },
    { key: null, label: "Push", load: true }
  ];
  var grid = el("div", { class: "grid" });
  grid.appendChild(el("div", {}));                       /* corner */

  var dates = [];
  for (var i = 6; i >= 0; i--) dates.push(shiftDay(t, -i));

  dates.forEach(function (d) {
    var p = d.split("-").map(Number);
    grid.appendChild(el("div", { class: "grid-day" + (d === t ? " now" : ""),
      text: DAY_NAMES[new Date(p[0], p[1] - 1, p[2]).getDay()].charAt(0) }));
  });

  rows.forEach(function (row) {
    grid.appendChild(el("div", { class: "grid-label", text: row.label }));
    dates.forEach(function (d) {
      var e = state.days[d];
      var text = "–", fill = VAL.none, delta = null;
      /* Each row asks its own half of the record whether that day counts:
         Push reads the demand items, the rest read the symptom items. */
      var ready = e && (row.load ? loadBurden(e) !== null : dayBurden(e) !== null);
      if (ready) {
        if (row.key === null) {
          /* how many items sat above baseline, in the same two red steps:
             symptoms for Worse, the five demand items for Push */
          var above = (row.load ? DEMAND_ITEMS : SCORE_ITEMS).filter(function (it) {
            if (!itemCounts(e, it.key)) return false;
            var b = itemBurden(it, e.v[it.key], state.baselines[it.key]);
            return b !== null && b > 0;
          }).length;
          text = String(above);
          delta = above === 0 ? 0 : above <= 2 ? 1 : 2;
        } else {
          var v = itemCounts(e, row.key) ? e.v[row.key] : undefined;
          if (v !== undefined) {
            var item = ITEM_BY_KEY[row.key];
            var base = state.baselines[row.key];
            text = String(v);
            delta = item.higherIsBetter ? base - v : v - base;
          }
        }
        if (delta !== null) fill = valenceFill(delta);
      }
      var cell = el("button", {
        class: "cell" + (fill === VAL.none ? " empty" : ""), type: "button", text: text,
        "aria-label": pretty(d) + " " + row.label + " " + text,
        onclick: function () { openEvening(d); }
      });
      if (fill !== VAL.none) {
        cell.style.background = fill;
        cell.style.color = INK[fill];
      }
      grid.appendChild(cell);
    });
  });

  return el("div", { class: "grid-wrap" }, [
    grid,
    el("div", { class: "strip-cap",
      text: "Worse = symptoms above baseline. Push = demand above it." })
  ]);
}

function backupLine() {
  var last = state.lastBackupAt;
  var text, stale;
  if (!last) {
    text = "No backup yet — download the JSON in History";
    stale = true;
  } else {
    var days = Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
    text = "Backed up " + (days === 0 ? "today" : days === 1 ? "yesterday" : days + " days ago");
    stale = days >= 14;
    if (stale) text += " — worth doing again";
  }
  return el("button", { class: "backup" + (stale ? " stale" : ""), type: "button", text: text,
    onclick: function () { state.tab = "history"; render(); } });
}

function homeScreen() {
  var t = today();
  var y = shiftDay(t, -1);
  var eve = state.days[t];
  var eveDone = !!(eve && eve.complete);
  var night = state.days[y];
  var nightDone = nightIsLogged(night);
  var wrap = el("div");
  var due = [], done = [];

  wrap.appendChild(el("div", { class: "home-head" }, [
    el("span", { text: pretty(t) }),
    el("span", { class: "sub", text: eveDone && nightDone ? " · all logged" : "" })
  ]));

  /* Evening */
  if (eveDone) {
    done.push(doneLine("Evening logged · " + offBaselineKeys(eve, EVENING_KEYS).length + " off baseline",
      function () { openEvening(t); }));
  } else if (eve) {
    due.push(dueCard("Finish the evening",
      "Draft · " + offBaselineKeys(eve, EVENING_KEYS).length + " off baseline",
      function () { openEvening(t); }));
  } else {
    due.push(dueCard("Evening", "How today went", function () { openEvening(t); },
      el("button", { class: "card-quick", type: "button", text: "Nothing off baseline — save it",
        onclick: function () {
          update(t, function (e) { e.complete = true; e.savedAt = new Date().toISOString(); });
          saveNow(); render(); flash("Day saved");
        }})));
  }

  /* Morning — the night that just ended */
  var nightSub = "Night of " + pretty(y) + " → " + pretty(t);
  if (nightDone) {
    var n = state.days[y];
    done.push(doneLine("Night logged · sleep " + n.v.sleep +
      (n.v.episode ? " · ep " + n.v.episode : ""), function () { openMorning(y); }));
  } else {
    due.push(dueCard("Morning", nightSub, function () { openMorning(y); }));
  }

  /* Before mid-afternoon the night comes first. */
  if (new Date().getHours() < 15) due.reverse();
  due.forEach(function (c) { wrap.appendChild(c); });

  /* The note written for yourself last night. */
  if (night && night.nightNote && !nightDone) {
    wrap.appendChild(el("div", { class: "note-card" }, [
      el("div", { class: "note-card-head", text: "You wrote this last night" }),
      el("div", { class: "note-card-body", text: night.nightNote })
    ]));
  }

  wrap.appendChild(el("div", { class: "spacer" }));
  wrap.appendChild(scoreTile());
  wrap.appendChild(pemTile());
  wrap.appendChild(weekGrid());
  done.forEach(function (c) { wrap.appendChild(c); });
  wrap.appendChild(backupLine());
  return wrap;
}

/* ---------- evening ---------- */

function eveningScreen() {
  var date = state.eveDate;
  var entry = getEntry(date);
  var rows = [];
  var wrap = el("div");

  wrap.appendChild(dateNav(
    function () { return state.eveDate; },
    function (d) { state.eveDate = d; eveDateManual = true; render(); },
    function (cap) {
      var word = relativeWord(date);
      cap.appendChild(el("span", { text: "Evening — " + pretty(date) }));
      if (word) cap.appendChild(el("span", { class: "sub", text: " · " + word }));
    }
  ));

  var msg = el("div", { class: "msg", style: { display: "none" } });

  wrap.appendChild(el("div", { class: "pair" }, [
    el("button", { class: "btn", type: "button", text: "Copy yesterday", onclick: function () {
      var prev = state.days[shiftDay(date, -1)];
      if (!prev) { msg.textContent = "No entry for the day before."; msg.style.display = ""; return; }
      update(date, function (e) {
        EVENING_KEYS.forEach(function (k) {
          if (prev.v[k] !== undefined) { e.v[k] = prev.v[k]; e.touched[k] = true; }
        });
      });
      saveNow(); render();
    }}),
    el("button", { class: "btn", type: "button", text: "Reset to baseline", onclick: function () {
      update(date, function (e) {
        EVENING_KEYS.forEach(function (k) { e.v[k] = state.baselines[k]; delete e.touched[k]; });
      });
      saveNow(); render();
    }})
  ]));
  wrap.appendChild(msg);

  var counter = el("div", { class: "note-line" });
  function paintCounter() {
    var n = offBaselineKeys(getEntry(date), EVENING_KEYS).length;
    counter.textContent = n + (n === 1 ? " item" : " items") + " away from baseline";
  }

  EVENING_SECTIONS.forEach(function (sec) {
    var kids = sec.items.map(function (it) {
      var row = ratingRow(it,
        function () { return getEntry(date).v[it.key]; },
        function (n) {
          update(date, function (e) { e.v[it.key] = n; e.touched[it.key] = true; });
          saveNow();
        },
        function () { return state.baselines[it.key]; },
        paintCounter);
      rows.push(row);
      return row.el;
    });
    wrap.appendChild(section(sec.title, kids));
  });

  /* bedtime */
  var bite = el("input", { type: "time", value: entry.lastBite || "" });
  bite.addEventListener("input", function () {
    update(date, function (e) { e.lastBite = bite.value; });
    saveSoon(200);
  });
  var stomachRow = el("div", { class: "opts" });
  var stomachBtns = [];
  STOMACH.forEach(function (s) {
    var b = el("button", { type: "button", text: s, "aria-pressed": "false", onclick: function () {
      update(date, function (e) { e.stomach = e.stomach === s ? "" : s; });
      saveNow(); paintStomach();
    }});
    stomachBtns.push(b);
    stomachRow.appendChild(b);
  });
  function paintStomach() {
    var cur = getEntry(date).stomach;
    stomachBtns.forEach(function (b, i) {
      var on = cur === STOMACH[i];
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.setAttribute("data-dark", on ? "1" : "0");
      b.style.background = on ? "var(--accent)" : "";
      b.style.borderColor = on ? "var(--accent)" : "";
    });
  }
  paintStomach();
  wrap.appendChild(section("Bedtime", [
    el("div", { class: "field-label", text: "Time of last bite" }),
    bite,
    el("div", { class: "spacer" }),
    el("div", { class: "field-label", text: "Stomach" }),
    stomachRow
  ]));

  /* note + tags */
  var tagWrap = el("div", { class: "tags" });
  TAGS.forEach(function (tag) {
    var b = el("button", { type: "button", text: tag, "aria-pressed": "false", onclick: function () {
      update(date, function (e) {
        e.tags = e.tags.indexOf(tag) >= 0
          ? e.tags.filter(function (t) { return t !== tag; })
          : e.tags.concat([tag]);
      });
      saveNow();
      b.setAttribute("aria-pressed", getEntry(date).tags.indexOf(tag) >= 0 ? "true" : "false");
    }});
    b.setAttribute("aria-pressed", (entry.tags || []).indexOf(tag) >= 0 ? "true" : "false");
    tagWrap.appendChild(b);
  });
  var note = el("textarea", { rows: "3", placeholder: "Anything worth writing down" });
  note.value = entry.note || "";
  note.addEventListener("input", function () {
    update(date, function (e) { e.note = note.value; });
    saveSoon();
  });
  wrap.appendChild(section("Note", [tagWrap, note]));

  var nightNote = el("textarea", { rows: "3", placeholder: "What you want to remember about tonight" });
  nightNote.value = entry.nightNote || "";
  nightNote.addEventListener("input", function () {
    update(date, function (e) { e.nightNote = nightNote.value; });
    saveSoon();
  });
  wrap.appendChild(section("For tonight — you'll see this in the morning", [nightNote]));

  wrap.appendChild(el("button", {
    class: "btn primary", type: "button",
    text: state.days[date] && state.days[date].complete ? "Update this day" : "Save day",
    onclick: function () {
      update(date, function (e) {
        e.complete = true;
        e.savedAt = new Date().toISOString();
      });
      saveNow();
      state.tab = "home";
      render();
      flash("Day saved");
    }
  }));
  paintCounter();
  wrap.appendChild(counter);
  return wrap;
}

/* ---------- morning ---------- */

function morningScreen() {
  var date = state.mornDate;
  var entry = getEntry(date);
  var wrap = el("div");

  wrap.appendChild(dateNav(
    function () { return state.mornDate; },
    function (d) { state.mornDate = d; mornDateManual = true; render(); },
    function (cap) {
      cap.appendChild(el("span", {
        text: "Night of " + pretty(date) + " → " + pretty(shiftDay(date, 1))
      }));
    }
  ));

  wrap.appendChild(el("div", { class: "hint",
    text: "A night belongs to the evening date, so this is logged under " + pretty(date) + "." }));

  MORNING_ITEMS.forEach(function (it) {
    var row = ratingRow(it,
      function () { return getEntry(date).v[it.key]; },
      function (n) {
        update(date, function (e) { e.v[it.key] = n; e.touched[it.key] = true; });
        saveNow();
      },
      function () { return state.baselines[it.key]; });
    wrap.appendChild(row.el);
  });

  /* Hours slept. Half hour steps on the buttons so it needs no keyboard in the
     dark; the field still takes a typed number if you want to be exact. */
  var hours = el("input", { type: "number", step: "0.5", min: "0", max: "24",
    inputmode: "decimal", class: "hours-field", placeholder: "–" });
  hours.value = entry.sleepHours === undefined || entry.sleepHours === null ? "" : entry.sleepHours;
  function writeHours(v) {
    var n = v === "" ? "" : Math.max(0, Math.min(24, Math.round(parseFloat(v) * 2) / 2));
    if (n !== "" && isNaN(n)) n = "";
    hours.value = n;
    update(date, function (e) { e.sleepHours = n; });
    saveSoon(200);
  }
  hours.addEventListener("change", function () { writeHours(hours.value); });
  function step(by) {
    /* From blank, the first press lands on 8 rather than 8.5 — it is a
       starting point to adjust from, not an increment. */
    var cur = parseFloat(hours.value);
    writeHours(isNaN(cur) ? 8 : cur + by);
    saveNow();
  }
  wrap.appendChild(section("Hours slept", [
    el("div", { class: "stepper" }, [
      el("button", { class: "btn", type: "button", text: "−", "aria-label": "Half an hour less",
        onclick: function () { step(-0.5); } }),
      hours,
      el("button", { class: "btn", type: "button", text: "+", "aria-label": "Half an hour more",
        onclick: function () { step(0.5); } })
    ]),
    el("div", { class: "note-line", text: "Time asleep, not time lying down. Leave it blank if you have no idea." })
  ]));

  var nightNote = el("textarea", { rows: "5", placeholder: "Written last night, or add to it now" });
  nightNote.value = entry.nightNote || "";
  nightNote.addEventListener("input", function () {
    update(date, function (e) { e.nightNote = nightNote.value; });
    saveSoon();
  });
  wrap.appendChild(section("Note for this night", [nightNote]));

  wrap.appendChild(el("button", { class: "btn primary", type: "button", text: "Done",
    onclick: function () {
      update(date, function (e) { e.morningDone = true; });
      saveNow(); state.tab = "home"; render();
    }}));
  return wrap;
}

/* ---------- baseline ---------- */

function baselineScreen() {
  var wrap = el("div");
  wrap.appendChild(el("div", { class: "hint",
    text: "Your normal value for each item. New days start here, and anything different gets a dot. The dashed outline on the entry screens marks the baseline." }));
  ALL_ITEMS.forEach(function (it) {
    var row = ratingRow(it,
      function () { return state.baselines[it.key]; },
      function (n) { state.baselines[it.key] = n; saveNow(); },
      null);
    wrap.appendChild(row.el);
  });
  wrap.appendChild(el("button", { class: "btn primary", type: "button", text: "Done",
    onclick: function () { state.tab = "home"; render(); } }));
  wrap.appendChild(el("div", { class: "note-line",
    text: "Each tap applies straight away. Done just takes you back." }));
  return wrap;
}

/* ---------- backup files ---------- */

function backupJson() {
  return JSON.stringify({
    app: "daily-log", version: STORE_VERSION, exportedAt: new Date().toISOString(),
    baselines: state.baselines, days: state.days
  }, null, 2);
}

function csvCell(v) {
  var s = String(v === undefined || v === null ? "" : v).replace(/[\r\n]+/g, " ");
  return /[",]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function backupCsv() {
  var rows = [["observation_date", "tracker_name", "tracker_category", "observation_value", "baseline"]];
  Object.keys(state.days).sort().forEach(function (d) {
    var e = state.days[d];
    ALL_KEYS.forEach(function (k) {
      if (e.v[k] === undefined) return;
      rows.push([d, EXPORT_NAME[k], CATEGORY[k], e.v[k],
        state.baselines[k] === undefined ? "" : state.baselines[k]]);
    });
    if (e.sleepHours !== "" && e.sleepHours !== undefined && e.sleepHours !== null) {
      rows.push([d, EXPORT_NAME.sleepHours, CATEGORY.sleepHours, e.sleepHours, ""]);
    }
    if (e.lastBite) rows.push([d, EXPORT_NAME.lastBite, CATEGORY.lastBite, e.lastBite, ""]);
    if (e.stomach) rows.push([d, EXPORT_NAME.stomach, CATEGORY.stomach, e.stomach, ""]);
    if (e.tags && e.tags.length) rows.push([d, "Tags", "Note", e.tags.join("|"), ""]);
    if (e.note) rows.push([d, "Note", "Note", e.note, ""]);
    if (e.nightNote) rows.push([d, "Night note", "Note", e.nightNote, ""]);
  });
  return rows.map(function (r) { return r.map(csvCell).join(","); }).join("\n");
}

function download(name, text, type) {
  try {
    var blob = new Blob([text], { type: type });
    var url = URL.createObjectURL(blob);
    var a = el("a", { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 2000);
    return true;
  } catch (e) {
    return false;
  }
}

/* Merge, never clobber: a day already here is only replaced by a newer one. */
function restore(parsed) {
  var added = 0, updated = 0, kept = 0;
  var days = parsed.days || {};
  Object.keys(days).forEach(function (d) {
    var incoming = days[d];
    var mine = state.days[d];
    if (!mine) { state.days[d] = incoming; added++; return; }
    var a = incoming.updatedAt || incoming.savedAt || "";
    var b = mine.updatedAt || mine.savedAt || "";
    if (a > b) { state.days[d] = incoming; updated++; } else { kept++; }
  });
  if (parsed.baselines) {
    state.baselines = Object.assign({}, DEFAULT_BASELINES, parsed.baselines);
  }
  saveNow();
  return { added: added, updated: updated, kept: kept };
}

/* ---------- history ---------- */

var pendingMsg = "";

function historyScreen() {
  var wrap = el("div");
  var dates = Object.keys(state.days).sort().reverse();
  var msg = el("div", { class: "msg", style: { display: "none" } });
  function say(text) { msg.textContent = text; msg.style.display = ""; }
  if (pendingMsg) { say(pendingMsg); pendingMsg = ""; }

  wrap.appendChild(el("div", { class: "hint",
    text: dates.length + (dates.length === 1 ? " day logged" : " days logged") }));

  if (dates.length === 0) {
    wrap.appendChild(el("div", { class: "hint",
      text: "Nothing saved yet. Fill in the Evening screen and press Save day." }));
  }

  dates.forEach(function (d) {
    var e = state.days[d];
    var off = offBaselineKeys(e, ALL_KEYS).length;
    var meta = off + " off baseline" +
      (e.v.crash ? " · crash" : "") +
      (e.v.episode ? " · ep " + e.v.episode : "");
    wrap.appendChild(el("button", {
      class: "day" + (e.complete ? "" : " draft"), type: "button",
      onclick: function () { state.eveDate = d; eveDateManual = true; state.tab = "evening"; render(); }
    }, [
      el("div", { class: "line" }, [
        el("span", { text: pretty(d) + (e.complete ? "" : " — draft") }),
        el("span", { class: "meta", text: meta })
      ])
    ]));
  });

  /* Backups. Browser storage gets wiped sooner or later, so this is the part
     that has to work. */
  var file = el("input", { type: "file", accept: "application/json,.json", id: "restore-file", class: "hidden-file" });
  file.addEventListener("change", function () {
    var f = file.files && file.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(String(reader.result));
        if (!parsed || typeof parsed !== "object" || !parsed.days) {
          say("That file has no days in it."); return;
        }
        var r = restore(parsed);
        pendingMsg = "Restored: " + r.added + " new, " + r.updated + " updated, " +
          r.kept + " already newer here.";
        render();
      } catch (err) {
        say("That file isn't valid JSON.");
      }
    };
    reader.readAsText(f);
  });

  wrap.appendChild(section("Backup", [
    el("div", { class: "pair" }, [
      el("button", { class: "btn raised", type: "button", text: "Download JSON", onclick: function () {
        if (download("daily-log-" + today() + ".json", backupJson(), "application/json")) {
          state.lastBackupAt = new Date().toISOString();
          saveNow();
          say("JSON file downloaded.");
        } else {
          say("Download failed — use Copy JSON below.");
        }
      }}),
      el("button", { class: "btn raised", type: "button", text: "Download CSV", onclick: function () {
        say(download("daily-log-" + today() + ".csv", backupCsv(), "text/csv")
          ? "CSV file downloaded." : "Download failed — use Copy JSON below.");
      }})
    ]),
    el("label", { class: "btn raised wide file-btn", for: "restore-file",
      text: "Restore from a JSON file" }),
    file,
    el("div", { class: "note-line",
      text: "Merged in. A day already here is only replaced by a newer copy." }),
    el("div", { class: "spacer" }),
    el("button", { class: "btn raised wide", type: "button", text: "Copy JSON to clipboard",
      onclick: function () {
        var text = backupJson();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(
            function () { say("JSON copied."); },
            function () { say("Copy failed."); });
        } else {
          say("Clipboard not available on this phone.");
        }
      }}),
    msg
  ]));

  return wrap;
}

/* ---------- shell ---------- */

/* Evening and Morning are not permanent tabs. You reach them from Home, and
   the tab only appears while you are on one, so there is a way back. */
var TABS = [["home", "Home"], ["history", "History"], ["baseline", "Baseline"]];

function renderTabs() {
  var nav = document.getElementById("tabs");
  nav.innerHTML = "";
  var tabs = TABS.slice();
  if (state.tab === "evening") tabs.splice(1, 0, ["evening", "Evening"]);
  if (state.tab === "morning") tabs.splice(1, 0, ["morning", "Morning"]);
  tabs.forEach(function (t) {
    nav.appendChild(el("button", {
      type: "button", role: "tab", text: t[1],
      "aria-selected": state.tab === t[0] ? "true" : "false",
      onclick: function () { state.tab = t[0]; render(); }
    }));
  });
}

function renderBanner() {
  var b = document.getElementById("banner");
  b.innerHTML = "";
  if (state.storeOk) return;
  b.appendChild(el("div", { class: "banner" }, [
    el("div", { text: "This phone isn't letting the app save. Copy the JSON from History before you close it." }),
    el("div", { class: "small", text: state.storeMsg })
  ]));
}

function render() {
  renderTabs();
  renderBanner();
  var main = document.getElementById("screen");
  main.innerHTML = "";
  if (state.tab === "home") main.appendChild(homeScreen());
  else if (state.tab === "evening") main.appendChild(eveningScreen());
  else if (state.tab === "morning") main.appendChild(morningScreen());
  else if (state.tab === "baseline") main.appendChild(baselineScreen());
  else main.appendChild(historyScreen());
  window.scrollTo(0, 0);
}

/* ---------- start ---------- */

var startedAt = Date.now();
loadStore();
document.getElementById("version").textContent = VERSION;
render();
renderBanner();

/* Dates roll over while the app sits open in the background. Unless you moved
   the date yourself, coming back should land on the current day again. */
var eveDateManual = false, mornDateManual = false;
document.addEventListener("visibilitychange", function () {
  if (document.visibilityState !== "visible") { saveNow(); return; }
  var changed = false;
  if (!eveDateManual && state.eveDate !== today()) { state.eveDate = today(); changed = true; }
  if (!mornDateManual && state.mornDate !== shiftDay(today(), -1)) {
    state.mornDate = shiftDay(today(), -1); changed = true;
  }
  if (changed) render();
});
window.addEventListener("pagehide", function () { saveNow(); });

/* Service worker: offline shell and updates.

   A new build installs in the background whenever the app is opened with a
   connection. If you have not touched anything yet, it swaps itself in and
   reloads on its own within a few seconds of opening. If you are already
   entering a day, it waits and offers a tap in the corner instead, so nothing
   moves under your thumb. */
var touchedThisSession = false;
document.addEventListener("pointerdown", function () { touchedThisSession = true; }, true);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(function (reg) {
    function watch(worker) {
      if (!worker) return;
      worker.addEventListener("statechange", function () {
        if (worker.state === "installed" && navigator.serviceWorker.controller) offerUpdate(reg);
      });
    }
    if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg);
    watch(reg.installing);
    reg.addEventListener("updatefound", function () { watch(reg.installing); });
    /* Firefox only re-checks on its own once a day. */
    setTimeout(function () { reg.update().catch(function () {}); }, 3000);
  }).catch(function () { /* offline install is best-effort */ });

  var reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (reloading) return;
    /* Another window may have swapped the build in. Don't yank this one out
       from under a half-entered day. */
    if (touchedThisSession) { updateButton(null); return; }
    reloading = true;
    location.reload();
  });
}

function offerUpdate(reg) {
  if (!touchedThisSession && Date.now() - startedAt < 20000) {
    saveNow();
    if (reg.waiting) reg.waiting.postMessage("skip-waiting");
    return;
  }
  updateButton(reg);
}

function updateButton(reg) {
  if (document.getElementById("update-btn")) return;
  document.querySelector(".foot").insertBefore(
    el("button", { id: "update-btn", type: "button", text: "new build ready · load it",
      onclick: function () {
        saveNow();
        if (reg && reg.waiting) reg.waiting.postMessage("skip-waiting");
        else location.reload();
      }}),
    document.getElementById("status"));
}
