/* Daily log — vanilla JS, no build step, no network.
   When you change anything here, bump VERSION below AND the cache name at the
   top of sw.js. The version in the corner is how you check a new build loaded. */

var VERSION = "v1.0.0";
var STORE_KEY = "sr-daily-log-v1";
var STORE_VERSION = 2;

/* ---------- scales ---------- */

var RAMP4 = ["#2B333C", "#5C4A2C", "#8A6A31", "#C08A4B"];
var RAMP6 = ["#2B333C", "#4A4030", "#6B5730", "#8C6E33", "#AA7E3E", "#C9884A"];

/* ---------- items ---------- */

var EVENING_SECTIONS = [
  { title: "Energy", items: [
    { key: "tired", label: "Feeling tired / sluggish" },
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
  { key: "sleep", label: "Sleep" },
  { key: "episode", label: "Dysautonomic episode", max: 5, ramp: RAMP6 },
  { key: "syncope", label: "Near-syncope", max: 1, labels: ["no", "yes"] }
];

var EVENING_ITEMS = [];
EVENING_SECTIONS.forEach(function (s) { EVENING_ITEMS = EVENING_ITEMS.concat(s.items); });
var ALL_ITEMS = EVENING_ITEMS.concat(MORNING_ITEMS);
var EVENING_KEYS = EVENING_ITEMS.map(function (i) { return i.key; });
var ALL_KEYS = ALL_ITEMS.map(function (i) { return i.key; });

var DEFAULT_BASELINES = {
  tired: 2, crash: 0, brainFog: 2, headache: 0, noise: 2,
  muscleAches: 1, muscleWeakness: 2, breath: 1, soreThroat: 0,
  sweating: 0, hyper: 1, constipation: 0, diarrhea: 0,
  physical: 1, mental: 1, social: 1, emotional: 0, pacing: 1,
  sleep: 2, episode: 0, syncope: 0
};

var TAGS = ["episode", "visitor", "extra med", "bad night", "GI", "heat", "appointment"];
var STOMACH = ["none", "normal", "heavy", "odd"];

/* ---------- export naming (matches the Visible CSV) ---------- */

var EXPORT_NAME = {
  tired: "Feeling tired/sluggish", crash: "Crash", brainFog: "Brain Fog",
  headache: "Headache", noise: "Noise sensitivity", muscleAches: "Muscle aches",
  muscleWeakness: "Muscle weakness", breath: "Shortness of breath",
  soreThroat: "Sore throat", sweating: "Sweating & thermal dysregulation",
  hyper: "Hyper/sympathetic overdrive", constipation: "Constipation",
  diarrhea: "Diarrhea", physical: "Physically active", mental: "Mentally demanding",
  social: "Socially demanding", emotional: "Emotionally stressful",
  pacing: "Pacing (low = better)", sleep: "Sleep",
  episode: "Dysautonomic episode (0-5)", syncope: "Near-syncope",
  lastBite: "Time of last bite", stomach: "Stomach at bedtime"
};

var CATEGORY = {
  tired: "General", crash: "Experience", brainFog: "Brain", headache: "Brain",
  noise: "Sensory", muscleAches: "Muscles", muscleWeakness: "Muscles",
  breath: "Heart and Lungs", soreThroat: "Pain", sweating: "Custom",
  hyper: "Custom", constipation: "Gastrointestinal", diarrhea: "Gastrointestinal",
  physical: "Physical", mental: "Cognitive", social: "Social",
  emotional: "Emotional", pacing: "Custom", sleep: "Sleep",
  episode: "Custom", syncope: "Custom", lastBite: "Custom", stomach: "Custom"
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
  tab: "evening",
  eveDate: today(),
  mornDate: shiftDay(today(), -1),
  storeOk: true,
  storeMsg: ""
};

function loadStore() {
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    var parsed = JSON.parse(raw);
    state.days = parsed.days || {};
    state.baselines = Object.assign({}, DEFAULT_BASELINES, parsed.baselines || {});
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
      version: STORE_VERSION, days: state.days, baselines: state.baselines
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
    lastBite: "", stomach: "", tags: [], note: "", nightNote: "",
    complete: false, savedAt: null, updatedAt: null
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
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.setAttribute("data-baseline", base === n ? "1" : "0");
      b.setAttribute("data-dark", n >= 2 ? "1" : "0");
      b.style.background = on ? ramp[Math.min(n, ramp.length - 1)] : "";
      b.style.borderColor = on ? ramp[Math.min(n, ramp.length - 1)] : "";
    });
    var off = base !== undefined && value !== undefined && value !== base;
    dot.style.display = off ? "" : "none";
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
      state.tab = "history";
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

  var nightNote = el("textarea", { rows: "5", placeholder: "Written last night, or add to it now" });
  nightNote.value = entry.nightNote || "";
  nightNote.addEventListener("input", function () {
    update(date, function (e) { e.nightNote = nightNote.value; });
    saveSoon();
  });
  wrap.appendChild(section("Note for this night", [nightNote]));

  wrap.appendChild(el("button", { class: "btn primary", type: "button", text: "Done",
    onclick: function () { saveNow(); state.tab = "history"; render(); } }));
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
    onclick: function () { state.tab = "evening"; render(); } }));
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
        say(download("daily-log-" + today() + ".json", backupJson(), "application/json")
          ? "JSON file downloaded." : "Download failed — use Copy JSON below.");
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

var TABS = [["evening", "Evening"], ["morning", "Morning"], ["history", "History"], ["baseline", "Baseline"]];

function renderTabs() {
  var nav = document.getElementById("tabs");
  nav.innerHTML = "";
  TABS.forEach(function (t) {
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
  if (state.tab === "evening") main.appendChild(eveningScreen());
  else if (state.tab === "morning") main.appendChild(morningScreen());
  else if (state.tab === "baseline") main.appendChild(baselineScreen());
  else main.appendChild(historyScreen());
  window.scrollTo(0, 0);
}

/* ---------- start ---------- */

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

/* Service worker: offline shell. A new build waits until every tab is closed,
   or until the line in the corner is tapped. */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(function (reg) {
    function watch(worker) {
      if (!worker) return;
      worker.addEventListener("statechange", function () {
        if (worker.state === "installed" && navigator.serviceWorker.controller) showUpdate(reg);
      });
    }
    if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg);
    watch(reg.installing);
    reg.addEventListener("updatefound", function () { watch(reg.installing); });
  }).catch(function () { /* offline install is best-effort */ });

  var reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
}

function showUpdate(reg) {
  var foot = document.querySelector(".foot");
  if (document.getElementById("update-btn")) return;
  foot.insertBefore(el("button", { id: "update-btn", type: "button", text: "new build ready · load it",
    onclick: function () {
      saveNow();
      if (reg.waiting) reg.waiting.postMessage("skip-waiting");
    }}), document.getElementById("status"));
}
