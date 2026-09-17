/* Daily log — vanilla JS, no build step, no network.
   When you change anything here, bump VERSION below AND the cache name at the
   top of sw.js. The version in the corner is how you check a new build loaded. */

var VERSION = "v1.14.0";
var STORE_KEY = "sr-daily-log-v1";
var STORE_VERSION = 3;

/* ---------- scales ---------- */

/* Severity reads as heat: nothing, yellow, orange, red. Yellow to red through
   orange is the one multi-hue ramp that is not a rainbow — the hues carry the
   meaning rather than decorating it. Every step takes dark ink at 4.9:1 or
   better, and none of them is bright enough to glare in a dark room. */
var RAMP4 = ["#2B333C", "#A88A38", "#C07A3E", "#CE6A55"];
var RAMP6 = ["#2B333C", "#645429", "#A88A38", "#C07A3E", "#CE6A55", "#D8806C"];

/* Sleep quality runs the other way — 3 is a good night — so it runs down
   through the same heat and out the other side into green. */
var SLEEP_RAMP = ["#CE6A55", "#C07A3E", "#454F5C", "#53946A"];

/* Mood is the one genuinely two-sided scale: neutral in the middle, and
   intensity growing outwards in both directions rather than only upwards. */
var MOOD_RAMP = ["#53946A", "#35604A", "#454F5C", "#C07A3E", "#CE6A55"];

/* Pacing is scored on the value, not the distance from baseline: 0 and 1 are
   both paced days and both pay, so both read green, with 0 the stronger of
   the two. Yellow is skipped — there is no "slightly off" here. */
var PACING_RAMP = ["#53946A", "#35604A", "#C07A3E", "#CE6A55"];

/* On Home, colour is distance from your baseline rather than the raw value,
   so the heat continues past the neutral into green for better than normal. */
var VAL = {
  good2: "#53946A",   /* two or more better than baseline */
  good1: "#35604A",
  same:  "#454F5C",
  bad1:  "#A88A38",   /* one worse  — yellow */
  bad2:  "#C07A3E",   /* two worse  — orange */
  bad3:  "#CE6A55",   /* three or more worse — red */
  none:  "transparent"
};

/* Three line slots, assigned in this fixed order and never cycled.

   Three is the cap because of what the numbers say, not taste: at this
   lightness these three are ΔE 6.2 apart under protanopia — inside the floor
   band, which is only legal alongside a second channel that is not colour. So
   each slot also owns a dash pattern, and every point carries a dot. A fourth
   hue muted enough for this screen collapses into one of these (a purple I
   tried sat ΔE 0.5 from the blue under deuteranopia — indistinguishable). */
var SERIES_DETAIL = { week: "#C4714C", pem: "#8FB6E0" };

var SLOTS = [
  { colour: "#C4714C", dash: "" },
  { colour: "#8FB6E0", dash: "6 3" },
  { colour: "#3E7F72", dash: "1.5 3" }
];
var MAX_LINES = SLOTS.length;

/* Whichever of the two text colours actually reads on each fill. */
var INK = {
  "#A88A38": "#14181C", "#C07A3E": "#14181C", "#CE6A55": "#14181C",
  "#D8806C": "#14181C", "#53946A": "#14181C",
  "#2B333C": "#C6CED6", "#645429": "#C6CED6", "#454F5C": "#C6CED6",
  "#35604A": "#C6CED6"
};

/* A 0-100 load, banded the same way the PEM predictor bands itself. */
function heatFill(score) {
  if (score === null || score === undefined) return VAL.none;
  if (score === 0) return VAL.same;
  if (score <= 20) return VAL.bad1;
  if (score <= 40) return VAL.bad2;
  return VAL.bad3;
}

function valenceFill(delta) {
  if (delta === null || delta === undefined) return VAL.none;
  if (delta <= -2) return VAL.good2;
  if (delta === -1) return VAL.good1;
  if (delta === 0) return VAL.same;
  if (delta === 1) return VAL.bad1;
  if (delta === 2) return VAL.bad2;
  return VAL.bad3;
}

/* ---------- items ---------- */

var BUILTIN_SECTIONS = [
  { title: "Energy", band: "Symptoms", items: [
    { key: "tired", label: "Feeling tired / sluggish" },
    { key: "pem", label: "PEM" },
    { key: "crash", label: "Crash", max: 1, labels: ["no", "yes"] }
  ]},
  { title: "Brain", items: [
    { key: "mood", label: "Mood", max: 4, ramp: MOOD_RAMP,
      labels: ["happy", "good", "neutral", "meh", "bad"] },
    { key: "brainFog", label: "Brain fog" },
    { key: "headache", label: "Headache" },
    { key: "noise", label: "Noise sensitivity" }
  ]},
  { title: "Body", items: [
    { key: "muscleAches", label: "Muscle burn" },
    { key: "muscleWeakness", label: "Muscle weakness" },
    { key: "breath", label: "Shortness of breath" },
    { key: "soreThroat", label: "Sore throat" },
    { key: "sweating", label: "Sweating / thermal dysregulation" },
    { key: "hyper", label: "Hyper / sympathetic overdrive" },
    { key: "mcas", label: "MCAS" }
  ]},
  { title: "Gut", items: [
    { key: "constipation", label: "Constipation" },
    { key: "diarrhea", label: "Diarrhea" },
    { key: "indigestion", label: "Post-dinner indigestion" }
  ]},
  { title: "Anything else", items: [
    { key: "other", label: "Other" }
  ]},
  { title: "What the day asked of you", band: "Exertion", items: [
    { key: "physical", label: "Physically active" },
    { key: "orthostatic", label: "Orthostatic exertion" },
    { key: "mental", label: "Mentally demanding" },
    { key: "social", label: "Socially demanding" },
    { key: "emotional", label: "Emotionally stressful" },
    { key: "pacing", label: "Pacing (low = better)", ramp: PACING_RAMP }
  ]}
];

var BUILTIN_MORNING = [
  { key: "sleep", label: "Sleep quality", ramp: SLEEP_RAMP, higherIsBetter: true },
  { key: "episode", label: "Dysautonomic episode", max: 5, ramp: RAMP6 },
  { key: "syncope", label: "Near-syncope", max: 1, labels: ["no", "yes"] }
];

/* The registry is rebuilt rather than fixed, because what is tracked is a
   setting now: items can be hidden, and your own can be added. Everything
   downstream — the entry screens, the scores, the panels, the chart picker —
   reads these, so there is one place that decides what exists.

   Hidden items keep their history. They stop being offered for entry and stop
   counting toward the scores, but every value ever recorded still exports. */
var EVENING_SECTIONS, EVENING_ITEMS, MORNING_ITEMS, ALL_ITEMS, ITEM_BY_KEY,
    EVENING_KEYS, ALL_KEYS, MORNING_KEYS, CARRY_KEYS,
    LOAD_KEYS, SCORE_ITEMS, DEMAND_ITEMS, MIN_SCORED, MIN_LOAD_ITEMS;

var BUILTIN_LOAD_KEYS = ["physical", "orthostatic", "mental", "social", "emotional", "pacing"];

function customItems(band) {
  return (state.custom || []).filter(function (c) { return c.band === band; })
    .map(function (c) {
      var item = { key: c.key, label: c.label, custom: true };
      if (c.max !== undefined) item.max = c.max;
      if (c.max === 1) item.labels = ["no", "yes"];
      return item;
    });
}

function isHidden(key) {
  return !!(state.hidden && state.hidden[key]);
}

function rebuildItems() {
  var visible = function (i) { return !isHidden(i.key); };

  EVENING_SECTIONS = BUILTIN_SECTIONS.map(function (sec) {
    var items = sec.items.filter(visible);
    if (sec.title === "What the day asked of you") {
      items = items.concat(customItems("exertion").filter(visible));
    }
    return { title: sec.title, band: sec.band, items: items };
  }).filter(function (sec) { return sec.items.length > 0; });

  var mine = customItems("symptoms").filter(visible);
  if (mine.length) {
    /* Your own symptoms sit at the end of the Symptoms band, before Exertion. */
    var at = EVENING_SECTIONS.length;
    for (var i = 0; i < EVENING_SECTIONS.length; i++) {
      if (EVENING_SECTIONS[i].band === "Exertion") { at = i; break; }
    }
    EVENING_SECTIONS.splice(at, 0, { title: "Your own", items: mine });
  }
  /* A band header belongs to whichever section now opens that band. */
  var seen = {};
  EVENING_SECTIONS.forEach(function (sec) {
    if (sec.band) { seen[sec.band] = true; }
  });
  if (!seen.Symptoms && EVENING_SECTIONS.length && !EVENING_SECTIONS[0].band) {
    EVENING_SECTIONS[0].band = "Symptoms";
  }

  MORNING_ITEMS = BUILTIN_MORNING.filter(visible).concat(customItems("night").filter(visible));

  EVENING_ITEMS = [];
  EVENING_SECTIONS.forEach(function (sec) { EVENING_ITEMS = EVENING_ITEMS.concat(sec.items); });
  ALL_ITEMS = EVENING_ITEMS.concat(MORNING_ITEMS);
  ITEM_BY_KEY = {};
  ALL_ITEMS.forEach(function (i) { ITEM_BY_KEY[i.key] = i; });
  EVENING_KEYS = EVENING_ITEMS.map(function (i) { return i.key; });
  ALL_KEYS = ALL_ITEMS.map(function (i) { return i.key; });
  MORNING_KEYS = MORNING_ITEMS.map(function (i) { return i.key; });
  CARRY_KEYS = EVENING_KEYS;

  LOAD_KEYS = BUILTIN_LOAD_KEYS.concat(customItems("exertion").map(function (i) { return i.key; }));
  SCORE_ITEMS = ALL_ITEMS.filter(function (i) { return LOAD_KEYS.indexOf(i.key) < 0; });
  DEMAND_ITEMS = ALL_ITEMS.filter(function (i) { return LOAD_KEYS.indexOf(i.key) >= 0; });

  /* The floors have to bend to what is actually tracked, or hiding a handful
     of items would silently switch a score off for good. */
  MIN_SCORED = Math.max(1, Math.min(8, Math.ceil(SCORE_ITEMS.length / 2)));
  MIN_LOAD_ITEMS = Math.max(1, Math.min(3, Math.ceil((DEMAND_ITEMS.length + 2) / 2)));
}

/* Every key that has ever been defined, so hiding or deleting an item never
   drops its history out of the CSV. */
function exportKeys() {
  var keys = [];
  BUILTIN_SECTIONS.forEach(function (sec) {
    sec.items.forEach(function (i) { keys.push(i.key); });
  });
  BUILTIN_MORNING.forEach(function (i) { keys.push(i.key); });
  (state.custom || []).forEach(function (c) {
    if (keys.indexOf(c.key) < 0) keys.push(c.key);
  });
  Object.keys(state.retired || {}).forEach(function (k) {
    if (keys.indexOf(k) < 0) keys.push(k);
  });
  return keys;
}

function exportNameFor(key) {
  if (EXPORT_NAME[key]) return EXPORT_NAME[key];
  var c = (state.custom || []).filter(function (x) { return x.key === key; })[0];
  if (c) return c.label;
  return (state.retired || {})[key] || key;
}

var DEFAULT_BASELINES = {
  tired: 2, pem: 1, crash: 0, mood: 2, brainFog: 2, headache: 0, noise: 2,
  muscleAches: 1, muscleWeakness: 2, breath: 1, soreThroat: 0,
  sweating: 0, hyper: 1, mcas: 0, constipation: 0, diarrhea: 0, indigestion: 0,
  other: 0,
  physical: 1, orthostatic: 1, mental: 1, social: 1, emotional: 0, pacing: 1,
  sleep: 2, episode: 0, syncope: 0,
  /* Not a 0-3 rating: the hours you normally need. Only shortfall counts. */
  hoursTarget: 8
};

var TAGS = ["episode", "visitor", "extra med", "bad night", "GI", "heat", "appointment"];
/* "Stomach at bedtime" was a four way pick until v1.6.0, when it became the
   rated Post-dinner indigestion item. Old values still export unchanged. */

/* ---------- export naming (matches the Visible CSV) ---------- */

var EXPORT_NAME = {
  tired: "Feeling tired/sluggish", pem: "Post-exertional malaise",
  crash: "Crash", mood: "Mood", brainFog: "Brain Fog",
  headache: "Headache", noise: "Noise sensitivity", muscleAches: "Muscle aches",
  muscleWeakness: "Muscle weakness", breath: "Shortness of breath",
  soreThroat: "Sore throat", sweating: "Sweating & thermal dysregulation",
  hyper: "Hyper/sympathetic overdrive", mcas: "MCAS", other: "Other",
  constipation: "Constipation",
  diarrhea: "Diarrhea", indigestion: "Post-dinner indigestion",
  physical: "Physically active", orthostatic: "Orthostatic exertion",
  mental: "Mentally demanding",
  social: "Socially demanding", emotional: "Emotionally stressful",
  pacing: "Pacing (low = better)", sleep: "Sleep",
  episode: "Dysautonomic episode (0-5)", syncope: "Near-syncope",
  lastBite: "Time of last bite", stomach: "Stomach at bedtime",
  sleepHours: "Sleep hours"
};

var CATEGORY = {
  tired: "General", pem: "General", crash: "Experience",
  mood: "Emotional", brainFog: "Brain", headache: "Brain",
  noise: "Sensory", muscleAches: "Muscles", muscleWeakness: "Muscles",
  breath: "Heart and Lungs", soreThroat: "Pain", sweating: "Custom",
  hyper: "Custom", mcas: "Custom", other: "Custom",
  constipation: "Gastrointestinal", diarrhea: "Gastrointestinal",
  indigestion: "Gastrointestinal",
  physical: "Physical", orthostatic: "Physical", mental: "Cognitive", social: "Social",
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
  lastBackupAt: null,
  chartKeys: ["symptoms", "exertion"],
  detail: "week",
  hidden: {},
  custom: [],
  retired: {},
  pay: { on: true, win: 0.20, pacing1: 0.25, pacing0: 0.50 },
  purchases: []
};

/* Mood went from four points to five in v1.9.0, with neutral inserted in the
   middle. Under the old scale 2 meant "meh" and 3 meant "bad"; under the new
   one those are 3 and 4. Without this, a day logged as bad would quietly
   redisplay as meh. Runs on anything written before store version 3, and on
   restored backups too. */
function migrate(parsed) {
  if (!parsed || (parsed.version || 0) >= 3) return parsed;
  var bump = function (v) { return v === 2 ? 3 : v === 3 ? 4 : v; };
  Object.keys(parsed.days || {}).forEach(function (d) {
    var e = parsed.days[d];
    if (e && e.v && e.v.mood !== undefined) e.v.mood = bump(e.v.mood);
  });
  if (parsed.baselines && parsed.baselines.mood !== undefined) {
    parsed.baselines.mood = bump(parsed.baselines.mood);
  }
  parsed.version = 3;
  return parsed;
}

function loadStore() {
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    var parsed = migrate(JSON.parse(raw));
    state.days = parsed.days || {};
    state.baselines = Object.assign({}, DEFAULT_BASELINES, parsed.baselines || {});
    state.lastBackupAt = parsed.lastBackupAt || null;
    if (parsed.chartKeys && parsed.chartKeys.length) state.chartKeys = parsed.chartKeys;
    state.hidden = parsed.hidden || {};
    state.custom = parsed.custom || [];
    state.retired = parsed.retired || {};
    state.pay = Object.assign({ on: true, win: 0.20, pacing1: 0.25, pacing0: 0.50 }, parsed.pay || {});
    state.purchases = parsed.purchases || [];
    rebuildItems();
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
      lastBackupAt: state.lastBackupAt, chartKeys: state.chartKeys,
      hidden: state.hidden, custom: state.custom, retired: state.retired, pay: state.pay,
      purchases: state.purchases
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

/* Only the rated items — state.baselines also carries hoursTarget, which is a
   setting rather than a value a day can hold. */
function baselineValues() {
  var v = {};
  ALL_KEYS.forEach(function (k) { v[k] = state.baselines[k]; });
  return v;
}

function emptyEntry(date) {
  return {
    date: date, v: baselineValues(), touched: {},
    lastBite: "", stomach: "", sleepHours: "", wins: [], tags: [],
    note: "", exertionNote: "", nightNote: "",
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
      /* On a no/yes item, yes is the severe end, not step one of four. A crash
         drawn in the mildest colour on the scale would read as a small thing. */
      var fill = ramp[max === 1 && n === 1 ? ramp.length - 1 : Math.min(n, ramp.length - 1)];
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

/* Stepper buttons so a value needs no keyboard in the dark; the field still
   takes a typed number. Used for hours of sleep and for the reward amounts. */
function numberStepper(get, set, opts) {
  opts = opts || {};
  var step = opts.step === undefined ? 0.5 : opts.step;
  var min = opts.min === undefined ? 0 : opts.min;
  var max = opts.max === undefined ? 24 : opts.max;
  var dp = opts.decimals === undefined ? 1 : opts.decimals;
  var field = el("input", { type: "number", step: String(step), min: String(min), max: String(max),
    inputmode: "decimal", class: "hours-field", placeholder: opts.placeholder || "\u2013" });

  function show(n) {
    field.value = n === "" || n === null || n === undefined ? "" : String(Number(n));
  }
  show(get());

  function write(v) {
    var n = v === "";
    if (!n) {
      var f = parseFloat(v);
      if (isNaN(f)) { n = true; }
      else {
        f = Math.max(min, Math.min(max, Math.round(f / step) * step));
        v = Number(f.toFixed(dp));
      }
    }
    if (n) v = opts.required ? get() : "";
    show(v);
    set(v);
    saveSoon(200);
  }
  field.addEventListener("change", function () { write(field.value); });

  function bump(by) {
    /* From blank the first press lands on the anchor, not anchor plus a step. */
    var v = parseFloat(field.value);
    write(isNaN(v) ? (opts.anchor === undefined ? 8 : opts.anchor) : v + by);
    saveNow();
  }
  return el("div", { class: "stepper" }, [
    el("button", { class: "btn", type: "button", text: "\u2212", "aria-label": "Less",
      onclick: function () { bump(-step); } }),
    field,
    el("button", { class: "btn", type: "button", text: "+", "aria-label": "More",
      onclick: function () { bump(step); } })
  ]);
}

function hoursStepper(get, set, opts) {
  return numberStepper(get, set, Object.assign({ step: 0.5, max: 24, anchor: 8 }, opts || {}));
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

function itemCounts(entry, key) {
  if (entry.touched && entry.touched[key]) return true;
  if (MORNING_KEYS.indexOf(key) >= 0) return nightIsLogged(entry);
  return !!entry.complete;
}

/* A day part way through entry says almost nothing. One item tapped at its
   worst would otherwise read as a score of 0. Half the items is the floor for
   a day to count at all; pressing Save day clears it comfortably. */

/* As above, for the symptom side. */
function scoreParts(entry) {
  var parts = [];
  SCORE_ITEMS.forEach(function (it) {
    if (!itemCounts(entry, it.key)) return;
    var b = itemBurden(it, entry.v[it.key], state.baselines[it.key]);
    if (b !== null) parts.push({ key: it.key, label: it.label, burden: b });
  });
  return parts;
}

/* Mean burden across the items that day actually stands behind. */
function dayBurden(entry) {
  if (!entry) return null;
  var parts = scoreParts(entry);
  if (parts.length < MIN_SCORED) return null;
  var sum = 0;
  parts.forEach(function (p) { sum += p.burden; });
  return sum / parts.length;
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

/* Hours short of the hours you normally need, as 0..1. Sleeping longer than
   target scores 0 rather than earning credit, the same as every other item.
   A blank is not a zero — it is no reading at all. */
function hoursBurden(entry) {
  var h = entry.sleepHours;
  if (h === "" || h === undefined || h === null) return null;
  var target = state.baselines.hoursTarget || DEFAULT_BASELINES.hoursTarget;
  if (!target) return null;
  return Math.max(0, Math.min(1, (target - Number(h)) / target));
}

/* Everything the predictor weighs on one day, as a flat list. Both the score
   and the panel that explains it read from here, so they cannot disagree about
   what counted. Sleep quality and sleep hours are separate items: two readings
   of the same night, but each carries its own weight. */
function loadParts(entry) {
  var parts = [];
  DEMAND_ITEMS.forEach(function (it) {
    if (!itemCounts(entry, it.key)) return;
    var b = itemBurden(it, entry.v[it.key], state.baselines[it.key]);
    if (b !== null) parts.push({ key: it.key, label: it.label, burden: b });
  });
  if (itemCounts(entry, "sleep")) {
    var q = itemBurden(ITEM_BY_KEY.sleep, entry.v.sleep, state.baselines.sleep);
    if (q !== null) parts.push({ key: "sleep", label: "Sleep quality", burden: q });
  }
  var h = nightIsLogged(entry) ? hoursBurden(entry) : null;
  if (h !== null) parts.push({ key: "sleepHours", label: "Sleep hours", burden: h });
  return parts;
}

function loadBurden(entry) {
  if (!entry) return null;
  var parts = loadParts(entry);
  if (parts.length < MIN_LOAD_ITEMS) return null;
  var sum = 0;
  parts.forEach(function (p) { sum += p.burden; });
  return sum / parts.length;
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
    var b = loadBurden(settledEntry(shiftDay(endDate, -i)));
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
    var sc = dayScore(settledEntry(shiftDay(endDate, -i)));
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
    var b = dayBurden(settledEntry(shiftDay(endDate, -i)));
    if (b === null) continue;
    var w = Math.pow(0.5, i / 3);
    sum += w * b; weight += w; days++;
  }
  if (days < 3) return { score: null, days: days };
  return { score: Math.round(100 * (1 - sum / weight)), days: days };
}

/* Today is still happening. Until you press Save day it is a day in progress,
   not a reading: a couple of items tapped in the afternoon would otherwise feed
   both scores, and today carries the heaviest weight in the PEM predictor of
   any day in the window. So every backward-looking view — the scores, their
   panels, the chart, the strips — reads days through here, and today joins the
   record when the evening is submitted.

   The pot is deliberately not gated: a win should pay the moment you log it. */
function settledEntry(date) {
  var e = state.days[date];
  if (!e) return null;
  if (date === today() && !e.complete) return null;
  return e;
}

/* ---------- the pot ---------- */

/* Paid for the two things worth reinforcing: noticing you did something well,
   and pacing. Pacing is scored on the value itself rather than on the distance
   from baseline — 1 is your normal and still earns, 0 earns double. */
function payWin() { return state.pay.on ? state.pay.win : 0; }
function payPacing(v) {
  if (!state.pay.on) return 0;
  return v === 0 ? state.pay.pacing0 : v === 1 ? state.pay.pacing1 : 0;
}

function euro(n) {
  /* The sign belongs in front of the symbol, not between it and the digits. */
  return (n < 0 ? "\u2212\u20ac" : "\u20ac") + Math.abs(n).toFixed(2);
}

/* A day only pays for pacing you actually stood behind, so days that merely
   exist at their pre-filled baseline do not quietly earn. */
function pacingPay(entry) {
  if (!entry || !itemCounts(entry, "pacing")) return 0;
  return payPacing(entry.v.pacing);
}
function winCount(entry) {
  return entry && entry.wins ? entry.wins.length : 0;
}
function dayPay(entry) {
  return winCount(entry) * payWin() + pacingPay(entry);
}

function winTotal() {
  var n = 0;
  Object.keys(state.days).forEach(function (d) { n += winCount(state.days[d]); });
  return n;
}

function earnedTotal() {
  var total = 0;
  Object.keys(state.days).forEach(function (d) { total += dayPay(state.days[d]); });
  return total;
}

function spentTotal() {
  var total = 0;
  (state.purchases || []).forEach(function (x) { total += Number(x.amount) || 0; });
  return total;
}

/* What is actually left to spend. */
function potTotal() {
  return earnedTotal() - spentTotal();
}

function logWin(date, text) {
  update(date, function (e) {
    if (!e.wins) e.wins = [];
    e.wins = e.wins.concat([{ at: new Date().toISOString(), text: text || "" }]);
  });
  saveNow();
}

/* pendingMsg is declared with the History screen and reused here. */

function removeWin(date, index) {
  update(date, function (e) {
    e.wins = (e.wins || []).slice();
    e.wins.splice(index, 1);
  });
  saveNow();
}

function rewardsScreen() {
  var wrap = el("div");
  var dates = Object.keys(state.days).sort().reverse();
  var wins = 0, pacing1 = 0, pacing0 = 0;
  dates.forEach(function (d) {
    var e = state.days[d];
    wins += winCount(e);
    if (itemCounts(e, "pacing") && e.v.pacing === 0) pacing0++;
    else if (itemCounts(e, "pacing") && e.v.pacing === 1) pacing1++;
  });

  var money = state.pay.on;
  wrap.appendChild(el("div", { class: "score" }, [
    el("div", { class: "score-label", text: money ? "In the pot" : "Things done well" }),
    el("div", { class: "score-head" }, [
      el("span", { class: "score-num pot", text: money ? euro(potTotal()) : String(wins) })
    ]),
    el("div", { class: "score-cap", text: money
      ? "Earned " + euro(earnedTotal()) + " · spent " + euro(spentTotal())
      : "Paying for them is switched off in Baseline" })
  ]));

  if (money) wrap.appendChild(el("div", { class: "section" }, [
    el("h2", { class: "section-head", text: "Where it came from" }),
    payLine(wins + (wins === 1 ? " thing done well" : " things done well"),
      wins + " × " + euro(state.pay.win), wins * payWin()),
    payLine(pacing1 + (pacing1 === 1 ? " day pacing at 1" : " days pacing at 1"),
      pacing1 + " × " + euro(state.pay.pacing1), pacing1 * payPacing(1)),
    payLine(pacing0 + (pacing0 === 1 ? " day pacing at 0" : " days pacing at 0"),
      pacing0 + " × " + euro(state.pay.pacing0), pacing0 * payPacing(0))
  ]));

  if (pendingMsg) {
    wrap.appendChild(el("div", { class: "msg", text: pendingMsg }));
    pendingMsg = "";
  }

  /* ---- add one you did not log at the time ---- */
  var addMsg = el("div", { class: "msg", style: { display: "none" } });
  var winDate = el("input", { type: "date", value: today() });
  var winText = el("input", { type: "text", placeholder: "What was it? (optional)" });
  wrap.appendChild(el("h2", { class: "band", text: "Add one you missed" }));
  wrap.appendChild(el("div", { class: "field-label", text: "Day" }));
  wrap.appendChild(winDate);
  wrap.appendChild(el("div", { class: "spacer" }));
  wrap.appendChild(winText);
  wrap.appendChild(el("div", { class: "spacer" }));
  wrap.appendChild(el("button", { class: "btn wide raised", type: "button", text: "Add it to that day",
    onclick: function () {
      var d = winDate.value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        addMsg.textContent = "Pick a day first."; addMsg.style.display = ""; return;
      }
      logWin(d, winText.value);
      pendingMsg = "Added to " + pretty(d) + ".";
      render();
    }}));
  wrap.appendChild(addMsg);

  /* ---- spending ---- */
  if (money) {
    var buyAmount = el("input", { type: "number", step: "0.05", min: "0", inputmode: "decimal",
      class: "hours-field", placeholder: "0.00" });
    var buyText = el("input", { type: "text", placeholder: "What did you get?" });
    var buyDate = el("input", { type: "date", value: today() });
    var buyMsg = el("div", { class: "msg", style: { display: "none" } });
    wrap.appendChild(el("h2", { class: "band", text: "Spend from it" }));
    wrap.appendChild(el("div", { class: "field-label", text: "Amount (\u20ac)" }));
    wrap.appendChild(buyAmount);
    wrap.appendChild(el("div", { class: "spacer" }));
    wrap.appendChild(buyText);
    wrap.appendChild(el("div", { class: "spacer" }));
    wrap.appendChild(buyDate);
    wrap.appendChild(el("div", { class: "spacer" }));
    wrap.appendChild(el("button", { class: "btn wide raised", type: "button", text: "Record it",
      onclick: function () {
        var amount = parseFloat(buyAmount.value);
        if (isNaN(amount) || amount <= 0) {
          buyMsg.textContent = "Put an amount in first."; buyMsg.style.display = ""; return;
        }
        state.purchases = (state.purchases || []).concat([{
          id: "p" + Date.now().toString(36),
          date: /^\d{4}-\d{2}-\d{2}$/.test(buyDate.value) ? buyDate.value : today(),
          text: buyText.value, amount: Math.round(amount * 100) / 100
        }]);
        saveNow();
        pendingMsg = "Recorded " + euro(amount) + ".";
        render();
      }}));
    wrap.appendChild(buyMsg);
    wrap.appendChild(el("div", { class: "note-line",
      text: "Nothing stops you going over — it is a record, not a lock." }));

    if ((state.purchases || []).length) {
      wrap.appendChild(el("h2", { class: "section-head", text: "Spent" }));
      state.purchases.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; })
        .forEach(function (x) {
          wrap.appendChild(el("div", { class: "day" }, [
            el("div", { class: "line" }, [
              el("span", { text: pretty(x.date) + (x.text ? " · " + x.text : "") }),
              el("span", { class: "meta" }, [
                el("span", { class: "day-pay", text: "\u2212" + euro(Number(x.amount)) })
              ])
            ]),
            el("button", { class: "quiet-btn", type: "button", text: "remove",
              onclick: function () {
                state.purchases = state.purchases.filter(function (y) { return y.id !== x.id; });
                saveNow(); render();
              }})
          ]));
        });
    }
  }

  /* ---- what was earned, day by day ---- */
  var earning = dates.filter(function (d) {
    return money ? dayPay(state.days[d]) > 0 : winCount(state.days[d]) > 0;
  });
  wrap.appendChild(el("h2", { class: "band", text: "Day by day" }));
  if (earning.length === 0) {
    wrap.appendChild(el("div", { class: "hint",
      text: money
        ? "Nothing yet. Tap \u201cDid something well\u201d on Home, or log a day paced at 1 or 0."
        : "Nothing yet. Tap \u201cDid something well\u201d on Home." }));
  }
  earning.forEach(function (d) {
    var e = state.days[d];
    var bits = [];
    if (winCount(e)) bits.push(winCount(e) + (winCount(e) === 1 ? " win" : " wins"));
    if (pacingPay(e)) bits.push("pacing " + e.v.pacing);
    var row = el("button", { class: "day", type: "button",
      onclick: function () { openEvening(d); } }, [
      el("div", { class: "line" }, [
        el("span", { text: pretty(d) }),
        el("span", { class: "meta" }, [
          el("span", { text: bits.join(" · ") }),
          money ? el("span", { class: "day-pay", text: euro(dayPay(e)) }) : null
        ])
      ])
    ]);
    (e.wins || []).forEach(function (w) {
      if (w.text) row.appendChild(el("div", { class: "win-text", text: "\u201c" + w.text + "\u201d" }));
    });
    wrap.appendChild(row);
  });

  wrap.appendChild(el("button", { class: "btn primary", type: "button", text: "Done",
    onclick: function () { state.tab = "home"; render(); } }));
  return wrap;
}

function payLine(label, sum, amount) {
  return el("div", { class: "pay-line" }, [
    el("span", { text: label }),
    el("span", { class: "pay-sum", text: sum }),
    el("span", { class: "pay-amount", text: euro(amount) })
  ]);
}

/* ---------- score detail ---------- */

/* Both scores are a weighted mean of daily burdens, and each daily burden is a
   plain mean over the items counted that day. That decomposes exactly: an
   item's share is the same weighted mean of its own burden divided by the
   number of items counted alongside it, and the shares add up to the points
   the score is down. Nothing here is an approximation of the number on Home. */
function contributions(kind) {
  var t = today();
  /* Derived from the same half life weekScore uses, rather than copied, so the
     two can never drift apart. */
  var weights = LOAD_WEIGHTS;
  if (kind !== "pem") {
    weights = [];
    for (var k = 0; k < 7; k++) weights.push(Math.pow(0.5, k / 3));
  }
  var contrib = {}, totalWeight = 0, daysUsed = 0;

  for (var i = 0; i < weights.length; i++) {
    var e = settledEntry(shiftDay(t, -i));
    if (!e) continue;
    var parts = kind === "pem" ? loadParts(e) : scoreParts(e);
    if (parts.length < (kind === "pem" ? MIN_LOAD_ITEMS : MIN_SCORED)) continue;
    var w = weights[i];
    totalWeight += w;
    daysUsed++;
    parts.forEach(function (p) {
      if (!contrib[p.key]) contrib[p.key] = { key: p.key, label: p.label, points: 0 };
      contrib[p.key].points += w * p.burden / parts.length;
    });
  }

  var rows = Object.keys(contrib).map(function (k) {
    contrib[k].points = totalWeight ? 100 * contrib[k].points / totalWeight : 0;
    return contrib[k];
  });
  rows.sort(function (a, b) { return b.points - a.points; });
  return { rows: rows, days: daysUsed };
}

/* The score itself, recomputed as it stood at the end of each of the last
   fourteen days. */
function scoreHistory(kind) {
  var t = today(), out = [];
  for (var i = 13; i >= 0; i--) {
    var d = shiftDay(t, -i);
    var r = kind === "pem" ? pemRisk(d) : weekScore(d);
    out.push({ date: d, value: kind === "pem" ? r.risk : r.score });
  }
  return out;
}

/* One line, fourteen points, fixed 0-100. A single series needs no legend —
   the heading above it says what it is. */
function detailChart(points, colour) {
  var W = 320, H = 100, padL = 6, padR = 6, padT = 10, padB = 10;
  var plotW = W - padL - padR, plotH = H - padT - padB;
  var x = function (i) { return padL + (plotW * i) / (points.length - 1); };
  var y = function (v) { return padT + plotH * (1 - v / 100); };
  var ns = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  svg.setAttribute("class", "chart");
  function node(name, attrs) {
    var n = document.createElementNS(ns, name);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  [0, 50, 100].forEach(function (v) {
    svg.appendChild(node("line", { x1: padL, x2: padL + plotW, y1: y(v), y2: y(v),
      stroke: "#252D36", "stroke-width": v === 0 ? 1 : 0.5 }));
  });
  var run = [];
  function flush() {
    if (run.length > 1) {
      svg.appendChild(node("path", { d: "M" + run.map(function (p) { return p[0] + " " + p[1]; }).join("L"),
        fill: "none", stroke: colour, "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    }
    run = [];
  }
  points.forEach(function (p, i) {
    if (p.value === null) { flush(); return; }
    run.push([x(i), y(p.value)]);
  });
  flush();
  points.forEach(function (p, i) {
    if (p.value === null) return;
    svg.appendChild(node("circle", { cx: x(i), cy: y(p.value), r: 3, fill: colour,
      stroke: "#171C22", "stroke-width": 1.2 }));
  });
  return svg;
}

/* Seven cells of what you actually entered for one item. */
function itemStrip(key) {
  var t = today();
  var strip = el("div", { class: "mini-strip" });
  for (var i = 6; i >= 0; i--) {
    (function (i) {
      var d = shiftDay(t, -i);
      var e = settledEntry(d);
      var text = "\u2013", fill = VAL.none;
      if (key === "sleepHours") {
        var hb = e && nightIsLogged(e) ? hoursBurden(e) : null;
        if (hb !== null) {
          text = String(e.sleepHours);
          fill = hb === 0 ? VAL.same : heatFill(Math.round(100 * hb));
        }
      } else if (e && itemCounts(e, key) && e.v[key] !== undefined) {
        var item = ITEM_BY_KEY[key];
        var base = state.baselines[key];
        text = item.labels ? item.labels[e.v[key]].slice(0, 4) : String(e.v[key]);
        fill = key === "pacing"
          ? PACING_RAMP[Math.min(e.v[key], PACING_RAMP.length - 1)]
          : valenceFill(item.higherIsBetter ? base - e.v[key] : e.v[key] - base);
      }
      var cell = el("div", { class: "mini-cell" + (fill === VAL.none ? " empty" : ""), text: text });
      if (fill !== VAL.none) { cell.style.background = fill; cell.style.color = INK[fill]; }
      strip.appendChild(cell);
    })(i);
  }
  return strip;
}

function detailScreen() {
  var kind = state.detail === "pem" ? "pem" : "week";
  var t = today();
  var wrap = el("div");
  var now = kind === "pem" ? pemRisk(t) : weekScore(t);
  var value = kind === "pem" ? now.risk : now.score;

  var band;
  if (value === null) band = ["#77828E", "not enough logged days yet"];
  else if (kind === "pem") {
    band = value <= 20 ? ["#6FAF87", "low"] : value <= 40 ? ["#C6CED6", "raised"] : ["#D08A6B", "high"];
  } else {
    band = value >= 85 ? ["#6FAF87", "at or near your normal"]
      : value >= 70 ? ["#C6CED6", "somewhat below your normal"] : ["#D08A6B", "well below your normal"];
  }

  var head = el("div", { class: "score-head" }, [
    el("span", { class: "score-num", text: value === null ? "\u2013" : String(value) }),
    el("span", { class: "score-band", text: band[1] })
  ]);
  head.querySelector(".score-num").style.color = band[0];
  wrap.appendChild(el("div", { class: "score" }, [
    el("div", { class: "score-label", text: kind === "pem" ? "PEM predictor" : "Week score" }),
    head,
    el("div", { class: "score-cap", text: kind === "pem"
      ? "Demand, pacing and sleep over four days, weighted so today and yesterday count most. Higher is a warning."
      : "Symptoms against your own baseline over seven days, recent days weighted. Higher is better." })
  ]));

  wrap.appendChild(el("h2", { class: "section-head panel-head", text: "Last 14 days" }));
  wrap.appendChild(detailChart(scoreHistory(kind), kind === "pem" ? SERIES_DETAIL.pem : SERIES_DETAIL.week));
  wrap.appendChild(el("div", { class: "strip-cap", text: "0-100, same scale as the number above" }));

  var made = contributions(kind);
  wrap.appendChild(el("h2", { class: "section-head panel-head",
    text: kind === "pem" ? "What is driving it" : "Where the points went" }));

  if (made.rows.length === 0) {
    wrap.appendChild(el("div", { class: "hint", text: "Nothing logged recently enough to break down." }));
  } else {
    var carrying = made.rows.filter(function (r) { return r.points >= 0.05; });
    var clear = made.rows.filter(function (r) { return r.points < 0.05; });
    var worst = carrying.length ? carrying[0].points : 1;

    carrying.forEach(function (r) {
      var bar = el("div", { class: "contrib-bar" });
      var fill = el("div", { class: "contrib-fill" });
      fill.style.width = Math.max(2, Math.round(100 * r.points / worst)) + "%";
      fill.style.background = kind === "pem" ? SERIES_DETAIL.pem : SERIES_DETAIL.week;
      bar.appendChild(fill);
      var row = el("div", { class: "contrib" }, [
        el("div", { class: "contrib-top" }, [
          el("span", { text: r.label }),
          el("span", { class: "contrib-points",
            text: (kind === "pem" ? "+" : "\u2212") + r.points.toFixed(1) })
        ]),
        bar
      ]);
      if (r.key === "sleepHours") {
        row.appendChild(el("div", { class: "contrib-note", text: sleepNote() }));
      }
      row.appendChild(itemStrip(r.key));
      wrap.appendChild(row);
    });

    if (clear.length) {
      wrap.appendChild(el("div", { class: "hint", text: "At baseline or better: " +
        clear.map(function (r) { return r.label; }).join(", ") }));
    }
    wrap.appendChild(el("div", { class: "strip-cap",
      text: "Cells are the last 7 days of what you entered, newest on the right. The figures add up to the "
        + (kind === "pem" ? "score" : "points below 100") + ", give or take rounding." }));
  }

  wrap.appendChild(el("button", { class: "btn primary", type: "button", text: "Done",
    onclick: function () { state.tab = "home"; render(); } }));
  return wrap;
}

function sleepNote() {
  var t = today(), sum = 0, n = 0;
  for (var i = 0; i < 7; i++) {
    var e = settledEntry(shiftDay(t, -i));
    if (!e || !nightIsLogged(e)) continue;
    var h = e.sleepHours;
    if (h === "" || h === undefined || h === null) continue;
    sum += Number(h); n++;
  }
  var target = state.baselines.hoursTarget || DEFAULT_BASELINES.hoursTarget;
  return n
    ? "Target " + target + "h · last " + n + (n === 1 ? " night " : " nights ") + (sum / n).toFixed(1) + "h"
    : "Target " + target + "h · no hours logged yet";
}

/* ---------- home ---------- */

/* The hour the evening card appears. */
var EVENING_FROM_HOUR = 21;

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
  var box = el("button", { class: "score tappable", type: "button",
    onclick: function () { state.detail = "week"; state.tab = "detail"; render(); } });
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
  box.appendChild(el("span", { class: "tap-hint", text: "what is behind this" }));
  return box;
}

/* What the next day or two are exposed to. */
function pemTile() {
  var t = today();
  var now = pemRisk(t);
  var box = el("button", { class: "score tappable", type: "button",
    onclick: function () { state.detail = "pem"; state.tab = "detail"; render(); } });
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
    text: reading + " · demand, pacing and sleep over 4 days, a rule of thumb" }));
  box.appendChild(el("span", { class: "tap-hint", text: "what is behind this" }));
  return box;
}

/* Fourteen days of whichever lines you pick, everything scaled to 0-100 with
   up meaning worse, so lines built different ways can still share one axis.
   Symptoms and Exertion are the same loads the two scores are built from. A
   single item is drawn as its share of its own scale, and the readout gives
   you back the number you actually entered.

   Every logged day carries a dot, so a gap in entry is visible as a gap rather
   than having to be inferred from the line. Missing days break the line rather
   than being drawn through — a straight segment across a gap would invent days
   you never logged. */
var CHART_DAYS = 14;
var chartPick = null;        /* index of the day being read, or null */
var pickerOpen = false;

function shortLabel(label) {
  return label.split(" / ")[0].split(" (")[0];
}

function seriesDefs() {
  var defs = [
    { key: "symptoms", label: "Symptoms",
      value: function (e) { var b = dayBurden(e); return b === null ? null : Math.round(100 * b); } },
    { key: "exertion", label: "Exertion",
      value: function (e) { var b = loadBurden(e); return b === null ? null : Math.round(100 * b); } }
  ];
  defs.push({
    key: "i:sleepHours", label: "Sleep hours",
    value: function (e) {
      var b = nightIsLogged(e) ? hoursBurden(e) : null;
      return b === null ? null : Math.round(100 * b);
    },
    raw: function (e) {
      if (!nightIsLogged(e)) return null;
      var h = e.sleepHours;
      return h === "" || h === undefined || h === null ? null : h + "h";
    }
  });
  ALL_ITEMS.forEach(function (it) {
    var max = it.max === undefined ? 3 : it.max;
    defs.push({
      key: "i:" + it.key, label: shortLabel(it.label), item: it,
      value: function (e) {
        if (!itemCounts(e, it.key)) return null;
        var v = e.v[it.key];
        if (v === undefined) return null;
        /* share of the item's own scale, in the direction that is worse */
        return Math.round(100 * (it.higherIsBetter ? (max - v) / max : v / max));
      },
      raw: function (e) {
        if (!itemCounts(e, it.key)) return null;
        return e.v[it.key] === undefined ? null : e.v[it.key];
      }
    });
  });
  return defs;
}

function activeSeries() {
  var defs = seriesDefs();
  var out = [];
  (state.chartKeys || []).forEach(function (k) {
    for (var i = 0; i < defs.length; i++) if (defs[i].key === k) { out.push(defs[i]); return; }
  });
  return out.slice(0, MAX_LINES);
}

function chart() {
  var host = el("div", { class: "chart-wrap" });

  function paint() {
    host.innerHTML = "";
    var picked = activeSeries();
    var t = today();
    var dates = [];
    for (var i = CHART_DAYS - 1; i >= 0; i--) dates.push(shiftDay(t, -i));

    var data = picked.map(function (def) {
      return dates.map(function (d) {
        var e = settledEntry(d);
        return e ? def.value(e) : null;
      });
    });

    var W = 320, H = 116, padL = 6, padR = 6, padT = 10, padB = 10;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var x = function (i) { return padL + (plotW * i) / (CHART_DAYS - 1); };
    var y = function (v) { return padT + plotH * (1 - v / 100); };

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("class", "chart");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", picked.length
      ? picked.map(function (p) { return p.label; }).join(" and ") + " over 14 days"
      : "No lines chosen");
    function node(name, attrs) {
      var n = document.createElementNS("http://www.w3.org/2000/svg", name);
      Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
      return n;
    }

    [0, 50, 100].forEach(function (v) {
      svg.appendChild(node("line", { x1: padL, x2: padL + plotW, y1: y(v), y2: y(v),
        stroke: "#252D36", "stroke-width": v === 0 ? 1 : 0.5 }));
    });

    picked.forEach(function (def, si) {
      var slot = SLOTS[si];
      var vals = data[si];
      var run = [];
      function flush() {
        if (run.length > 1) {
          svg.appendChild(node("path", {
            d: "M" + run.map(function (p) { return p[0] + " " + p[1]; }).join("L"),
            fill: "none", stroke: slot.colour, "stroke-width": 2,
            "stroke-dasharray": slot.dash, "stroke-linecap": "round", "stroke-linejoin": "round"
          }));
        }
        run = [];
      }
      vals.forEach(function (v, i) {
        if (v === null) { flush(); return; }
        run.push([x(i), y(v)]);
      });
      flush();
      /* a dot on every logged day, ringed so overlapping points stay readable */
      vals.forEach(function (v, i) {
        if (v === null) return;
        svg.appendChild(node("circle", { cx: x(i), cy: y(v), r: 3,
          fill: slot.colour, stroke: "#171C22", "stroke-width": 1.2 }));
      });
    });

    var marker = node("g", {});
    svg.appendChild(marker);
    function paintPick() {
      marker.innerHTML = "";
      if (chartPick === null) return;
      marker.appendChild(node("line", { x1: x(chartPick), x2: x(chartPick), y1: padT, y2: padT + plotH,
        stroke: "#77828E", "stroke-width": 1 }));
      picked.forEach(function (def, si) {
        var v = data[si][chartPick];
        if (v === null) return;
        marker.appendChild(node("circle", { cx: x(chartPick), cy: y(v), r: 5,
          fill: SLOTS[si].colour, stroke: "#0F1216", "stroke-width": 2 }));
      });
    }

    var half = plotW / (CHART_DAYS - 1) / 2;
    dates.forEach(function (d, i) {
      var hit = node("rect", { x: x(i) - half, y: 0, width: half * 2, height: H,
        fill: "transparent", style: "cursor:pointer" });
      hit.addEventListener("pointerdown", function () {
        chartPick = chartPick === i ? null : i;
        paintPick(); paintReadout();
      });
      svg.appendChild(hit);
    });
    host.appendChild(svg);

    /* legend: swatch carries the dash pattern, not just the hue */
    var legend = el("div", { class: "legend" });
    picked.forEach(function (def, si) {
      var sw = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      sw.setAttribute("viewBox", "0 0 16 4");
      sw.setAttribute("class", "swatch-line");
      sw.appendChild(node("line", { x1: 0, y1: 2, x2: 16, y2: 2, stroke: SLOTS[si].colour,
        "stroke-width": 2, "stroke-dasharray": SLOTS[si].dash, "stroke-linecap": "round" }));
      var item = el("span", { class: "item" }, [el("span", { text: def.label })]);
      item.insertBefore(sw, item.firstChild);
      legend.appendChild(item);
    });
    legend.appendChild(el("span", { class: "note", text: "0-100, up is worse" }));
    host.appendChild(legend);

    var readout = el("div", { class: "readout" });
    function paintReadout() {
      readout.innerHTML = "";
      if (chartPick === null) {
        readout.appendChild(el("span", { class: "readout-hint",
          text: picked.length ? "Tap any day to read it off" : "Pick a line below" }));
        return;
      }
      var d = dates[chartPick];
      var e = settledEntry(d);
      var open = el("button", { class: "readout-open", type: "button",
        onclick: function () { openEvening(d); } }, [
        el("span", { text: pretty(d) })
      ]);
      picked.forEach(function (def, si) {
        var shown = e && def.raw ? def.raw(e) : data[si][chartPick];
        var span = el("span", { class: "key",
          text: def.label + " " + (shown === null || shown === undefined ? "–" : shown) });
        span.style.color = SLOTS[si].colour;
        open.appendChild(span);
      });
      open.appendChild(el("span", { class: "readout-go", text: "open" }));
      readout.appendChild(open);
    }
    paintPick();
    paintReadout();
    host.appendChild(readout);

    /* line picker */
    var msg = el("div", { class: "msg", style: { display: "none" } });
    var toggle = el("button", { class: "quiet-btn", type: "button",
      text: pickerOpen ? "Done choosing lines" : "Change lines",
      onclick: function () { pickerOpen = !pickerOpen; paint(); } });
    host.appendChild(toggle);

    if (pickerOpen) {
      var chips = el("div", { class: "tags picker" });
      seriesDefs().forEach(function (def) {
        var on = (state.chartKeys || []).indexOf(def.key) >= 0;
        chips.appendChild(el("button", {
          type: "button", text: def.label, "aria-pressed": on ? "true" : "false",
          onclick: function () {
            var keys = (state.chartKeys || []).slice();
            var at = keys.indexOf(def.key);
            if (at >= 0) {
              keys.splice(at, 1);
            } else if (keys.length >= MAX_LINES) {
              msg.textContent = "Three lines at a time — past that the colours stop being reliably different.";
              msg.style.display = "";
              return;
            } else {
              keys.push(def.key);
            }
            state.chartKeys = keys;
            saveNow();
            paint();
          }
        }));
      });
      host.appendChild(chips);
      host.appendChild(msg);
    }
  }

  paint();
  return host;
}

/* One row: seven days of pacing, coloured by how it sits against your normal.
   Pacing is the thing you can actually steer, so it is the thing kept in view. */
function pacingRow() {
  var t = today();
  var grid = el("div", { class: "grid" });
  grid.appendChild(el("div", {}));
  var dates = [];
  for (var i = 6; i >= 0; i--) dates.push(shiftDay(t, -i));

  dates.forEach(function (d) {
    var p = d.split("-").map(Number);
    grid.appendChild(el("div", { class: "grid-day" + (d === t ? " now" : ""),
      text: DAY_NAMES[new Date(p[0], p[1] - 1, p[2]).getDay()].charAt(0) }));
  });

  grid.appendChild(el("div", { class: "grid-label", text: "Pacing" }));
  dates.forEach(function (d) {
    var e = settledEntry(d);
    var text = "\u2013", fill = VAL.none;
    if (e && itemCounts(e, "pacing") && e.v.pacing !== undefined) {
      text = String(e.v.pacing);
      /* by value, not by distance from baseline: both paced days read green */
      fill = PACING_RAMP[Math.min(e.v.pacing, PACING_RAMP.length - 1)];
    }
    var cell = el("button", {
      class: "cell" + (fill === VAL.none ? " empty" : ""), type: "button", text: text,
      "aria-label": pretty(d) + " pacing " + text,
      onclick: function () { openEvening(d); }
    });
    if (fill !== VAL.none) {
      cell.style.background = fill;
      cell.style.color = INK[fill];
    }
    grid.appendChild(cell);
  });

  return el("div", { class: "grid-wrap" }, [
    grid,
    el("div", { class: "strip-cap", text: "Pacing, low is better · 0 and 1 both pay" })
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
  var due = [], done = [], later = [];

  wrap.appendChild(el("div", { class: "home-head" }, [
    el("span", { text: pretty(t) }),
    el("span", { class: "sub", text: eveDone && nightDone ? " · all logged" : "" })
  ]));

  /* The evening belongs to the evening. Before then the card is out of the
     way, but the screen is still one tap from here — a card that only exists
     after nine would otherwise leave no route in at four in the afternoon. */
  var eveningOpen = new Date().getHours() >= EVENING_FROM_HOUR;

  /* Evening */
  if (eveDone) {
    done.push(doneLine("Evening logged · " + offBaselineKeys(eve, EVENING_KEYS).length + " off baseline",
      function () { openEvening(t); }));
  } else if (!eveningOpen) {
    later.push(el("button", { class: "quiet-btn", type: "button",
      text: eve ? "Evening — draft saved, open it now" : "Evening — open it now",
      onclick: function () { openEvening(t); } }));
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
  later.forEach(function (c) { wrap.appendChild(c); });

  /* Something done well. One tap logs it; the description is optional and
     comes after, so a bad day still gets the tap. The box repaints itself
     rather than leaning on a full re-render, so the field is there the moment
     the first one is logged. */
  var winBox = el("div", { class: "win-box" });
  function paintWins() {
    winBox.innerHTML = "";
    winBox.appendChild(el("button", { class: "btn wide win-btn", type: "button",
      text: "Did something well",
      onclick: function () {
        logWin(t);
        paintWins();
        var field = winBox.querySelector(".win-input");
        if (field) field.focus();
        flash(state.pay.on ? "Logged · " + euro(payWin()) : "Logged");
      }}));

    var wins = (state.days[t] && state.days[t].wins) || [];
    if (!wins.length) return;
    var last = wins.length - 1;
    winBox.appendChild(el("div", { class: "field-label", text: "What was it? (optional)" }));
    var note = el("input", { type: "text", class: "win-input", placeholder: "Say it in a few words" });
    note.value = wins[last].text || "";
    note.addEventListener("input", function () {
      update(t, function (e) { e.wins[last].text = note.value; });
      saveSoon();
    });
    winBox.appendChild(note);
    var line = el("div", { class: "win-added" }, [
      el("span", { text: wins.length + (wins.length === 1 ? " thing" : " things") + " today"
        + (state.pay.on ? " · " + euro(wins.length * payWin()) : "") }),
      el("button", { class: "win-undo", type: "button", text: "remove last",
        onclick: function () { removeWin(t, last); paintWins(); } })
    ]);
    winBox.appendChild(line);
  }
  paintWins();
  wrap.appendChild(winBox);

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
  wrap.appendChild(chart());
  wrap.appendChild(pacingRow());
  done.forEach(function (c) { wrap.appendChild(c); });
  wrap.appendChild(el("button", { class: "pot-line", type: "button",
    onclick: function () { state.tab = "rlhf"; render(); } }, [
    el("span", { text: state.pay.on ? "In the pot" : "Things done well" }),
    el("span", { class: "pot-amount", text: state.pay.on ? euro(potTotal()) : String(winTotal()) })
  ]));
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

  var band = null;
  EVENING_SECTIONS.forEach(function (sec) {
    if (sec.band && sec.band !== band) {
      band = sec.band;
      wrap.appendChild(el("h2", { class: "band", text: band }));
    }
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
  if (EVENING_SECTIONS.some(function (sec) { return sec.band === "Exertion"; })) {
    var exNote = el("textarea", { rows: "2",
      placeholder: "Which bits took it out of you?" });
    exNote.value = entry.exertionNote || "";
    exNote.addEventListener("input", function () {
      update(date, function (e) { e.exertionNote = exNote.value; });
      saveSoon();
    });
    wrap.appendChild(section("What it was (optional)", [exNote]));
  }

  /* Neither a symptom nor something the day asked of you, so it gets its own
     band rather than sitting under Exertion by accident. */
  wrap.appendChild(el("h2", { class: "band", text: "Bedtime and notes" }));
  wrap.appendChild(section(null, [
    el("div", { class: "field-label", text: "Time of last bite" }),
    bite
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

  wrap.appendChild(section("Hours slept", [
    hoursStepper(
      function () { return getEntry(date).sleepHours; },
      function (n) { update(date, function (e) { e.sleepHours = n; }); }
    ),
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

/* The setup screen. Baselines were the whole of it once; what is tracked and
   what it pays are settings now too, so they live here behind their own band
   headers rather than in the code. */
function baselineScreen() {
  var wrap = el("div");

  wrap.appendChild(el("h2", { class: "band", text: "Baselines" }));
  wrap.appendChild(el("div", { class: "hint",
    text: "Your normal value for each item. New days start here, and anything different gets a dot." }));
  ALL_ITEMS.forEach(function (it) {
    var row = ratingRow(it,
      function () { return state.baselines[it.key]; },
      function (n) { state.baselines[it.key] = n; saveNow(); },
      null);
    wrap.appendChild(row.el);
  });

  wrap.appendChild(el("h2", { class: "band", text: "Sleep" }));
  wrap.appendChild(el("div", { class: "field-label", text: "Hours you normally need" }));
  wrap.appendChild(hoursStepper(
    function () { return state.baselines.hoursTarget; },
    function (n) { state.baselines.hoursTarget = n === "" ? DEFAULT_BASELINES.hoursTarget : n; },
    { anchor: 8, required: true }
  ));
  wrap.appendChild(el("div", { class: "note-line",
    text: "Only sleeping short of this counts against the PEM predictor." }));

  /* ---- what to track ---- */
  wrap.appendChild(el("h2", { class: "band", text: "What to track" }));
  wrap.appendChild(el("div", { class: "hint",
    text: "Hidden items stop being asked for and stop counting toward the scores. Everything already recorded is kept and still exports." }));
  wrap.appendChild(el("div", { class: "hint",
    text: "Both scores are an average across the items tracked, so hiding or adding one changes what the number is an average of. Scores from before a change are not strictly comparable with scores after it." }));

  function trackRow(key, label, custom) {
    var off = isHidden(key);
    var row = el("div", { class: "track-row" + (off ? " off" : "") }, [
      el("button", { class: "track-name", type: "button",
        onclick: function () {
          if (off) delete state.hidden[key]; else state.hidden[key] = true;
          saveNow(); rebuildItems(); render(true);
        }
      }, [
        el("span", { text: label }),
        el("span", { class: "track-state", text: off ? "hidden" : "shown" })
      ])
    ]);
    if (custom) {
      row.appendChild(el("button", { class: "track-remove", type: "button", text: "remove",
        onclick: function () {
          state.retired = state.retired || {};
          state.retired[key] = label;
          state.custom = state.custom.filter(function (c) { return c.key !== key; });
          delete state.hidden[key];
          saveNow(); rebuildItems(); render(true);
        }}));
    }
    return row;
  }

  BUILTIN_SECTIONS.forEach(function (sec) {
    wrap.appendChild(el("div", { class: "section-head", text: sec.title }));
    sec.items.forEach(function (it) { wrap.appendChild(trackRow(it.key, it.label)); });
  });
  wrap.appendChild(el("div", { class: "section-head", text: "Night" }));
  BUILTIN_MORNING.forEach(function (it) { wrap.appendChild(trackRow(it.key, it.label)); });

  if ((state.custom || []).length) {
    wrap.appendChild(el("div", { class: "section-head", text: "Your own" }));
    state.custom.forEach(function (c) {
      wrap.appendChild(trackRow(c.key, c.label + " · " + bandName(c.band), true));
    });
  }

  /* ---- add your own ---- */
  var draft = { label: "", max: 3, band: "symptoms", base: 0 };
  var addMsg = el("div", { class: "msg", style: { display: "none" } });
  var nameField = el("input", { type: "text", placeholder: "Name it" });
  nameField.addEventListener("input", function () { draft.label = nameField.value; });

  function chipRow(options, get, set) {
    var row = el("div", { class: "tags" });
    options.forEach(function (o) {
      var btn = el("button", { type: "button", text: o.label,
        "aria-pressed": get() === o.value ? "true" : "false",
        onclick: function () {
          set(o.value);
          Array.prototype.forEach.call(row.children, function (c, i) {
            c.setAttribute("aria-pressed", options[i].value === get() ? "true" : "false");
          });
        }});
      row.appendChild(btn);
    });
    return row;
  }

  wrap.appendChild(el("div", { class: "section-head", text: "Add your own" }));
  wrap.appendChild(nameField);
  wrap.appendChild(el("div", { class: "field-label", text: "Scale" }));
  wrap.appendChild(chipRow([{ label: "0-3", value: 3 }, { label: "no / yes", value: 1 }],
    function () { return draft.max; },
    function (v) { draft.max = v; if (draft.base > v) draft.base = v; paintBase(); }));
  wrap.appendChild(el("div", { class: "field-label", text: "Where it belongs" }));
  wrap.appendChild(chipRow(
    [{ label: "Symptoms", value: "symptoms" }, { label: "Exertion", value: "exertion" },
     { label: "Night", value: "night" }],
    function () { return draft.band; }, function (v) { draft.band = v; }));
  var baseHost = el("div");
  function paintBase() {
    baseHost.innerHTML = "";
    baseHost.appendChild(el("div", { class: "field-label", text: "Its normal value" }));
    var row = ratingRow({ key: "draft", label: "Baseline", max: draft.max,
        labels: draft.max === 1 ? ["no", "yes"] : undefined },
      function () { return draft.base; },
      function (n) { draft.base = n; },
      null);
    baseHost.appendChild(row.el);
  }
  paintBase();
  wrap.appendChild(baseHost);

  wrap.appendChild(el("button", { class: "btn wide raised", type: "button", text: "Add it",
    onclick: function () {
      var label = (draft.label || "").trim();
      if (!label) { addMsg.textContent = "Give it a name first."; addMsg.style.display = ""; return; }
      var key = "c" + Date.now().toString(36);
      state.custom = (state.custom || []).concat([
        { key: key, label: label, max: draft.max, band: draft.band }]);
      state.baselines[key] = draft.base;
      saveNow(); rebuildItems(); render(true);
    }}));
  wrap.appendChild(el("div", { class: "note-line",
    text: "It joins Baselines above too, so the normal can be changed later." }));
  wrap.appendChild(addMsg);

  /* ---- rewards ---- */
  wrap.appendChild(el("h2", { class: "band", text: "Rewards" }));
  wrap.appendChild(el("button", { class: "track-row", type: "button",
    onclick: function () { state.pay.on = !state.pay.on; saveNow(); render(true); }
  }, [
    el("span", { class: "track-name-plain" }, [
      el("span", { text: "Pay for wins and pacing" }),
      el("span", { class: "track-state", text: state.pay.on ? "on" : "off" })
    ])
  ]));

  if (state.pay.on) {
    [["Each thing done well", "win", 0.20],
     ["A day paced at 1", "pacing1", 0.25],
     ["A day paced at 0", "pacing0", 0.50]].forEach(function (row) {
      wrap.appendChild(el("div", { class: "field-label", text: row[0] + " (\u20ac)" }));
      wrap.appendChild(numberStepper(
        function () { return state.pay[row[1]]; },
        function (n) { state.pay[row[1]] = n === "" ? row[2] : n; },
        { step: 0.05, min: 0, max: 20, decimals: 2, anchor: row[2], required: true }
      ));
    });
    wrap.appendChild(el("div", { class: "note-line",
      text: "Changing an amount re-prices every day already logged — the pot is worked out from the log, not banked." }));
  } else {
    wrap.appendChild(el("div", { class: "note-line",
      text: "Wins are still logged and still counted. Only the money is off." }));
  }

  wrap.appendChild(el("button", { class: "btn primary", type: "button", text: "Done",
    onclick: function () { state.tab = "home"; render(); } }));
  wrap.appendChild(el("div", { class: "note-line",
    text: "Everything here applies straight away. Done just takes you back." }));
  return wrap;
}

function bandName(band) {
  return band === "exertion" ? "Exertion" : band === "night" ? "Night" : "Symptoms";
}

/* ---------- backup files ---------- */

function backupJson() {
  return JSON.stringify({
    app: "daily-log", version: STORE_VERSION, exportedAt: new Date().toISOString(),
    baselines: state.baselines, hidden: state.hidden, custom: state.custom,
    retired: state.retired, pay: state.pay, purchases: state.purchases, days: state.days
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
    /* Everything ever defined, not just what is on screen today, so hiding an
       item never drops its history out of the export. */
    exportKeys().forEach(function (k) {
      if (e.v[k] === undefined) return;
      rows.push([d, exportNameFor(k), CATEGORY[k] || "Custom", e.v[k],
        state.baselines[k] === undefined ? "" : state.baselines[k]]);
    });
    if (e.sleepHours !== "" && e.sleepHours !== undefined && e.sleepHours !== null) {
      rows.push([d, EXPORT_NAME.sleepHours, CATEGORY.sleepHours, e.sleepHours, ""]);
    }
    if (e.lastBite) rows.push([d, EXPORT_NAME.lastBite, CATEGORY.lastBite, e.lastBite, ""]);
    if (e.stomach) rows.push([d, EXPORT_NAME.stomach, CATEGORY.stomach, e.stomach, ""]);
    (e.wins || []).forEach(function (w) {
      rows.push([d, "Done well", "Custom", w.text || "logged", ""]);
    });
    if (e.tags && e.tags.length) rows.push([d, "Tags", "Note", e.tags.join("|"), ""]);
    if (e.exertionNote) rows.push([d, "Exertion note", "Note", e.exertionNote, ""]);
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
  parsed = migrate(parsed);
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
  /* A backup carries what was being tracked, not just the numbers. */
  if (parsed.custom) state.custom = parsed.custom;
  if (parsed.hidden) state.hidden = parsed.hidden;
  if (parsed.retired) state.retired = parsed.retired;
  if (parsed.pay) state.pay = Object.assign({}, state.pay, parsed.pay);
  /* Purchases are a flat list, so merge by id rather than replacing: restoring
     an older backup must not wipe spending recorded since. */
  if (parsed.purchases) {
    var have = {};
    (state.purchases || []).forEach(function (x) { have[x.id] = true; });
    parsed.purchases.forEach(function (x) { if (!have[x.id]) state.purchases.push(x); });
  }
  rebuildItems();
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
var TABS = [["home", "Home"], ["rlhf", "RLHF"], ["history", "History"], ["baseline", "Baseline"]];

function renderTabs() {
  var nav = document.getElementById("tabs");
  nav.innerHTML = "";
  var tabs = TABS.slice();
  if (state.tab === "evening") tabs.splice(1, 0, ["evening", "Evening"]);
  if (state.tab === "detail") tabs.splice(1, 0, ["detail", "Score"]);
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

function render(keepScroll) {
  renderTabs();
  renderBanner();
  var main = document.getElementById("screen");
  main.innerHTML = "";
  if (state.tab === "home") main.appendChild(homeScreen());
  else if (state.tab === "evening") main.appendChild(eveningScreen());
  else if (state.tab === "morning") main.appendChild(morningScreen());
  else if (state.tab === "rlhf") main.appendChild(rewardsScreen());
  else if (state.tab === "detail") main.appendChild(detailScreen());
  else if (state.tab === "baseline") main.appendChild(baselineScreen());
  else main.appendChild(historyScreen());
  if (!keepScroll) window.scrollTo(0, 0);
}

/* ---------- start ---------- */

var startedAt = Date.now();
loadStore();
rebuildItems();
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
