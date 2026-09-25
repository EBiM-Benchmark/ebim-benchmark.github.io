// Questionnaire EN/zh parity harness (Questionnaire A and Questionnaire B).
//
// Each questionnaire's two pages (A: _site/feedback-registered.html and
// _site/zh/feedback-registered.html; B: _site/feedback-phase2.html and
// _site/zh/feedback-phase2.html) feed ONE dataset, so they must submit the
// same thing. Each pair renders from its own data file (questionnaireA.json /
// questionnaireB.json), but a template edit could still make them diverge; this
// reads the BUILT pages and runs every check below for each questionnaire. It
// fails if:
//
//   controls    — any form control (input, textarea incl. its content, select,
//                 button, fieldset, output, object) or question-wrapper tag differs
//                 EN vs zh. Attributes are compared order-insensitively and only
//                 the hidden lang value may differ; controls carry no translated
//                 text, so this also covers data-group, disabled, hidden, maxlength.
//   fields      — the ordered list of submitted field names differs EN vs zh or
//                 from the data file (a checkbox group counts once), or a field's
//                 control type is not the one its data-file type renders.
//   options     — a choice field's option codes/order differ, EN vs zh or vs the
//                 data file.
//   encoding    — a checkbox lacks data-group or a radio carries it (data-group
//                 is what makes the script send a group as ONE ";"-joined field).
//   defaults    — any control ships pre-answered: a checked box or radio, a value
//                 on a visible text/email input, or text inside a textarea.
//   conditions  — a question's data-show-if differs EN vs zh or vs the data file
//                 (compared as parsed JSON); a condition is not a non-empty list of
//                 {field, non-empty anyOf} naming a real choice field and its real
//                 codes; a conditional question is not rendered hidden + disabled
//                 (or an unconditional one is); a wrapper holds another question's
//                 input.
//   hidden      — access_key / from_name / subject / instrument differ; lang is
//                 not exactly "en" on EN and "zh" on zh.
//   close date  — the form's data-closes-at differs from the data file.
//   structure   — a named control sits outside #qForm, any control carries form=,
//                 a non-choice name repeats, or a control the script would send
//                 but this check does not model appears (select, named button,
//                 named fieldset/output/object).
//   scripts     — the questionnaire script is missing, or ANY inline script
//                 (other than JSON-LD) differs EN vs zh (line endings normalised).
//                 A single-source edit changes both pages alike, so
//                 scripts/verify.mjs also pins the EN script to its golden.
//
//   skeleton    — the form's full tag skeleton (every start/end tag with its
//                 attributes, text stripped, lang value masked) differs EN vs zh,
//                 or the list of external scripts differs — covers the form tag
//                 itself, the hCaptcha slot, and anything wrapped in <noscript> or
//                 <template> (whose contents never reach the DOM and are not
//                 scanned as controls).
//   well-formed — a tag repeats an attribute (the browser keeps the first), a
//                 hidden field is disabled, closesAt lacks an explicit UTC offset
//                 (it would be read in the visitor's time zone), a condition has
//                 keys other than {field, anyOf}, refers to itself or forms a
//                 cycle, a field repeats an option code, or the data file names an
//                 option set that does not exist.
//
// Questionnaire B only (it has required fields and a saved draft):
//
//   required    — a question's data-required-if differs EN vs zh or vs the data
//                 file; a required condition is not a non-empty list of {field,
//                 non-empty anyOf} naming a real choice field and its real codes,
//                 or sits on a choice question; a required question lacks its
//                 hidden message element (<p class="q-req-msg" id="<name>_req">
//                 inside its own wrapper) with the data file's text in the page's
//                 language, or a message element appears without a condition.
//   draft key   — the form's data-draft-key differs EN vs zh, from the data file,
//                 or from the fixed key "ebim-questionnaire-B-2026".
//
// Scope: this guards against HONEST template and data edits that would make the
// pages submit something other than the data file describes, or make EN and zh
// differ. It does not try to defeat deliberately obfuscated HTML, and it cannot
// know whether a value the data file itself holds is right (a changed access key
// in data + pages passes here; the EN golden in verify.mjs shows the diff).
//
// Tags are matched quote-aware, so a ">" inside an attribute value cannot hide an
// attribute. A floor guards against a broken instrument: a page with no fields
// is not a pass.
//
// Usage:  node scripts/verify-questionnaire.mjs            (builds, then verifies)
//         node scripts/verify-questionnaire.mjs --no-build (verify an existing _site)
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const SITE = path.join(ROOT, "_site");
// One entry per questionnaire. `marker` is the HTML comment that labels its
// behaviour script; `floor` is the fewest submitted fields a page may have.
const INSTRUMENTS = [
  { id: "A", en: "feedback-registered.html", zh: "zh/feedback-registered.html", data: "src/_data/questionnaireA.json", marker: "Questionnaire A", floor: 30 },
  { id: "B", en: "feedback-phase2.html", zh: "zh/feedback-phase2.html", data: "src/_data/questionnaireB.json", marker: "Questionnaire B", floor: 70,
    required: true, draftKey: "ebim-questionnaire-B-2026" },
];
const HIDDEN = ["access_key", "from_name", "subject", "instrument", "lang", "botcheck"];
// The control type each data-file question type renders as.
const RENDERS = { checkbox: "checkbox", single: "checkbox", radio: "radio", scale: "radio", text: "text", longtext: "textarea", email: "email" };
const HIDDEN_TYPES = { access_key: "hidden", from_name: "hidden", subject: "hidden", instrument: "hidden", lang: "hidden", botcheck: "checkbox" };

const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;

// A start tag of one of `names`, quote-aware (a ">" inside a quoted value does not end it).
const tagRe = (names) => new RegExp(`<(${names})\\b(?:[^>"']|"[^"]*"|'[^']*')*>`, "gi");

const decode = (s) =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

// Attributes of one start tag, any quoting style; a bare attribute reads as "".
// Like the browser, the FIRST of a repeated attribute wins; repeats are listed in
// dupAttrs() so the check can fail on them.
const ATTR_RE = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
const attrBody = (tag) => tag.replace(/^<\/?[a-zA-Z]+/, "").replace(/\/?>$/, "");
function attrs(tag) {
  const out = {};
  for (const m of attrBody(tag).matchAll(ATTR_RE)) {
    const k = m[1].toLowerCase();
    if (!(k in out)) out[k] = decode(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return out;
}
function dupAttrs(tag) {
  const seen = new Set();
  const dups = [];
  for (const m of attrBody(tag).matchAll(ATTR_RE)) {
    const k = m[1].toLowerCase();
    if (seen.has(k)) dups.push(k);
    seen.add(k);
  }
  return dups;
}
const CLOSES_AT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const sig = (name, a, extra = "") =>
  `<${name} ${Object.keys(a).sort().map((k) => `${k}=${JSON.stringify(a[k])}`).join(" ")}>${extra}`;
// Conditions compare as parsed JSON, so re-spacing is not a difference.
const canon = (s) => { try { return JSON.stringify(JSON.parse(s)); } catch { return s; } };

// Everything the page submits and branches on, extracted from built HTML.
function extract(rel, marker) {
  const raw = fs.readFileSync(path.join(SITE, rel), "utf8").replace(/\r\n/g, "\n");
  const scripts = [...raw.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((m) => { const a = attrs(`<script${m[1]}>`); return !("src" in a) && a.type !== "application/ld+json"; })
    .map((m) => m[2]);
  // External scripts, compared EN vs zh with the zh "../" asset prefix removed.
  const srcScripts = [...raw.matchAll(tagRe("script"))]
    .map((m) => attrs(m[0]).src).filter((s) => s !== undefined).map((s) => s.replace(/^(\.\.\/)+/, ""));
  const marked = raw.match(new RegExp(`<!-- ${marker}:[^>]*-->\\s*<script>([\\s\\S]*?)<\\/script>`));
  // Comments and script bodies can hold tag-like text that submits nothing.
  const full = raw.replace(/<!--[\s\S]*?-->/g, "").replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, "$1</script>");

  // The form's tag skeleton: every start/end tag with sorted attributes, text dropped.
  const findForm = (h) => {
    const f = [...h.matchAll(tagRe("form"))].filter((m) => attrs(m[0]).id === "qForm");
    if (!f.length) throw new Error(`${rel}: no <form id="qForm">`);
    return { start: f[0].index, end: h.indexOf("</form>", f[0].index), tag: f[0][0] };
  };
  const ff = findForm(full);
  const skeleton = [...full.slice(ff.start, ff.end + 7).matchAll(new RegExp(`${tagRe("[a-zA-Z][a-zA-Z0-9-]*").source}|</[a-zA-Z][a-zA-Z0-9-]*\\s*>`, "g"))]
    .map((m) => {
      if (m[0][1] === "/") return m[0].toLowerCase().replace(/\s+/g, "");
      const a = attrs(m[0]);
      if ("data-show-if" in a) a["data-show-if"] = canon(a["data-show-if"]);
      if (a.name === "lang" && a.type === "hidden") a.value = "<lang>";
      return sig(m[1].toLowerCase(), a);
    });

  // <noscript>/<template> contents never reach the DOM as form controls; the
  // skeleton above still sees them, so an EN/zh difference there still fails.
  const html = full.replace(/<(noscript|template)\b[\s\S]*?<\/\1\s*>/gi, "");
  const { start: formStart, end: formEnd, tag: formTagRaw } = findForm(html);
  const formTag = attrs(formTagRaw);

  // Question wrappers (<div class="q" …>) with their extent, found by div depth.
  const wrappers = [];
  const stack = [];
  for (const m of html.matchAll(new RegExp(`${tagRe("div").source}|</div>`, "gi"))) {
    if (m[0][1] === "/") {
      const w = stack.pop();
      if (w) w.end = m.index;
      continue;
    }
    const a = attrs(m[0]);
    const isQ = (a.class || "").split(/\s+/).includes("q");
    const w = isQ ? { start: m.index, end: Infinity, a, names: new Set() } : null;
    if (w) wrappers.push(w);
    stack.push(w);
  }

  const problems = [];
  const sigs = [];
  const fields = [];
  const byName = new Map();
  for (const m of html.matchAll(tagRe("input|textarea|select|button|fieldset|output|object"))) {
    const kind = m[1].toLowerCase();
    const a = attrs(m[0]);
    const inside = m.index > formStart && m.index < formEnd;
    const dups = dupAttrs(m[0]);
    if (dups.length) problems.push(`repeated attribute ${dups.join(", ")}: ${m[0]}`);
    if ("form" in a) problems.push(`control with form= attribute: ${m[0]}`);
    if (!inside) {
      if (a.name) problems.push(`named control outside #qForm: ${m[0]}`);
      continue;
    }
    let body = "";
    if (kind === "textarea") {
      const end = html.indexOf("</textarea>", m.index + m[0].length);
      body = html.slice(m.index + m[0].length, end < 0 ? undefined : end);
    }
    sigs.push(sig(kind, a.name === "lang" && a.type === "hidden" ? { ...a, value: "<lang>" } : a, body));
    if (kind === "fieldset" || kind === "output" || kind === "object" || kind === "button") {
      if (a.name) problems.push(`unsupported named control: ${m[0]}`);
      continue;
    }
    if (kind === "select") { problems.push(`unsupported control: ${m[0]}`); continue; }
    const name = a.name;
    if (!name) continue;
    const type = kind === "textarea" ? "textarea" : (a.type || "text").toLowerCase();
    if (type === "hidden" && "disabled" in a) problems.push(`${name}: hidden field is disabled (never sent) ${m[0]}`);
    // Nothing may ship pre-answered.
    if ((type === "checkbox" || type === "radio") && "checked" in a) problems.push(`${name}: pre-checked ${m[0]}`);
    if ((type === "text" || type === "email") && "value" in a) problems.push(`${name}: pre-filled ${m[0]}`);
    if (type === "textarea" && body.trim() !== "") problems.push(`${name}: pre-filled textarea "${body.trim().slice(0, 40)}"`);

    const w = wrappers.find((x) => m.index > x.start && m.index < x.end);
    if (w) w.names.add(name);
    if (!byName.has(name)) {
      byName.set(name, { type, codes: [], grouped: [], count: 0, value: null, disabled: [] });
      fields.push(name);
    }
    const e = byName.get(name);
    e.count++;
    e.disabled.push("disabled" in a);
    if (e.type !== type) problems.push(`${name}: mixed control types ${e.type} / ${type}`);
    if (type === "checkbox" || type === "radio") {
      if (name !== "botcheck" && e.codes.includes(a.value ?? null)) problems.push(`${name}: option code "${a.value}" repeats`);
      e.codes.push(a.value ?? null);
      e.grouped.push("data-group" in a);
    } else {
      e.value = a.value ?? null;
      if (e.count > 1) problems.push(`${name}: repeated non-choice field`);
    }
  }
  for (const w of wrappers) sigs.push(sig("div", "data-show-if" in w.a ? { ...w.a, "data-show-if": canon(w.a["data-show-if"]) } : w.a));

  // Required-field message elements (<p class="q-req-msg" …>text</p>).
  const reqMsgs = [...html.matchAll(new RegExp(`(${tagRe("p").source})([\\s\\S]*?)</p>`, "gi"))]
    .map((m) => ({ a: attrs(m[1]), text: decode(m[3]), index: m.index }))
    .filter((p) => (p.a.class || "").split(/\s+/).includes("q-req-msg"));

  const conditions = {};
  const required = {};
  for (const w of wrappers) {
    const q = w.a["data-q"];
    conditions[q] = "data-show-if" in w.a ? canon(w.a["data-show-if"]) : null;
    required[q] = "data-required-if" in w.a ? canon(w.a["data-required-if"]) : null;
    for (const n of w.names) if (n !== q) problems.push(`wrapper data-q="${q}" holds input name="${n}"`);
    if (!w.names.has(q)) problems.push(`wrapper data-q="${q}" holds no input named ${q}`);
  }

  return { fields, byName, conditions, required, reqMsgs, wrappers, sigs, skeleton, srcScripts, problems, scripts,
    closesAt: formTag["data-closes-at"], draftKey: formTag["data-draft-key"], script: marked ? marked[1] : null };
}

// The same, derived from the data file (the spec as encoded).
function expectedFromData(DATA) {
  const fields = [];
  const codes = {};
  const grouped = {};
  const types = { ...HIDDEN_TYPES };
  const conditions = {};
  const required = {};
  const requiredMsg = {};
  const problems = [];
  if (!CLOSES_AT_RE.test(DATA.closesAt || "")) problems.push(`closesAt "${DATA.closesAt}" needs an ISO date-time with an explicit offset (e.g. …T12:00:00Z)`);
  for (const q of dataQuestions(DATA)) {
    fields.push(q.name);
    types[q.name] = RENDERS[q.type] || `unknown data type "${q.type}"`;
    if (typeof q.options === "string" && !(q.options in (DATA.optionSets || {})))
      problems.push(`${q.name}: option set "${q.options}" does not exist`);
    const opts = typeof q.options === "string" ? (DATA.optionSets || {})[q.options] : q.options;
    if (q.type === "scale") {
      codes[q.name] = [];
      for (let v = q.min; v <= q.max; v++) codes[q.name].push(String(v));
      if (q.extra !== undefined) {
        if (!(q.extra in (DATA.optionSets || {}))) problems.push(`${q.name}: option set "${q.extra}" does not exist`);
        for (const o of (DATA.optionSets || {})[q.extra] || []) codes[q.name].push(o.code);
      }
    } else if (opts) codes[q.name] = opts.map((o) => o.code);
    if (codes[q.name] && new Set(codes[q.name]).size !== codes[q.name].length) problems.push(`${q.name}: repeated option code`);
    if ((q.type === "checkbox" || q.type === "radio" || q.type === "single") && !(codes[q.name] || []).length)
      problems.push(`${q.name}: choice question with no options`);
    grouped[q.name] = q.type === "checkbox" || q.type === "single";
    conditions[q.name] = q.showIf ? JSON.stringify(q.showIf) : null;
    required[q.name] = q.requiredIf ? JSON.stringify(q.requiredIf) : null;
    requiredMsg[q.name] = q.requiredMsg ?? null;
  }
  return { fields: [...fields, ...HIDDEN], codes, grouped, types, conditions, required, requiredMsg, problems };
}

// Every question in page order. A section holds `questions`, or `subsections`
// that hold `questions` or labelled `groups`; a `group` question (Questionnaire
// B's B5.2) contributes its `items`.
function dataQuestions(DATA) {
  const out = [];
  const take = (qs) => { for (const q of qs || []) { if (q.type === "group") out.push(...(q.items || [])); else out.push(q); } };
  for (const sec of DATA.sections) {
    take(sec.questions);
    for (const sub of sec.subsections || []) {
      take(sub.questions);
      for (const g of sub.groups || []) take(g.questions);
    }
  }
  return out;
}

// A condition graph (question → the fields its condition reads) must be acyclic:
// a self-reference or cycle means the question can never appear.
function conditionCycles(conds) {
  const edges = {};
  for (const [q, s] of Object.entries(conds)) {
    try { edges[q] = s ? JSON.parse(s).map((c) => c && c.field) : []; } catch { edges[q] = []; }
  }
  const bad = [];
  const state = {};
  const visit = (q, trail) => {
    if (state[q] === 2) return;
    if (state[q] === 1) { bad.push([...trail, q].join(" → ")); return; }
    state[q] = 1;
    for (const f of edges[q] || []) visit(f, [...trail, q]);
    state[q] = 2;
  };
  for (const q of Object.keys(edges)) visit(q, []);
  return bad;
}

function buildSite() {
  const r = spawnSync("npx", ["@11ty/eleventy", "--quiet"], { cwd: ROOT, stdio: "inherit", shell: true });
  if (r.status !== 0) throw new Error("eleventy build failed");
}

// Checks one {field, anyOf} list (a show-if or required-if) against a page's fields.
function condListProblems(label, q, raw, byName, what) {
  const out = [];
  let list;
  try { list = JSON.parse(raw); } catch { return [`${label} ${q}: ${what} is not JSON`]; }
  if (!Array.isArray(list) || !list.length) return [`${label} ${q}: ${what} is not a non-empty list`];
  for (const c of list) {
    const keys = c && typeof c === "object" ? Object.keys(c).sort().join(",") : "";
    if (keys !== "anyOf,field" || typeof c.field !== "string" || !Array.isArray(c.anyOf) || !c.anyOf.length) {
      out.push(`${label} ${q}: condition must be exactly {field, anyOf: [non-empty]}: ${JSON.stringify(c)}`);
      continue;
    }
    if (c.field === q) { out.push(`${label} ${q}: condition refers to itself`); continue; }
    const t = byName.get(c.field);
    if (!t) { out.push(`${label} ${q}: condition on unknown field ${c.field}`); continue; }
    if (t.type !== "checkbox" && t.type !== "radio") out.push(`${label} ${q}: condition on non-choice field ${c.field}`);
    for (const code of c.anyOf) if (!t.codes.includes(code)) out.push(`${label} ${q}: ${c.field} has no code "${code}"`);
  }
  return out;
}

function main() {
  if (!process.argv.includes("--no-build")) buildSite();
  let ok = true;
  for (const inst of INSTRUMENTS) if (!checkInstrument(inst)) ok = false;
  console.log("\n" + (ok ? GREEN(BOLD("✓ QUESTIONNAIRE PARITY PASSED")) : RED(BOLD("✗ QUESTIONNAIRE PARITY FAILED"))) + "\n");
  process.exit(ok ? 0 : 1);
}

function checkInstrument(inst) {
  const { en: EN, zh: ZH, marker, floor } = inst;
  const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, inst.data), "utf8"));
  console.log(BOLD(`\nQuestionnaire ${inst.id} — EN/zh parity (${EN} vs ${ZH})\n`));

  const results = [];
  const add = (name, ok, msg = "") => results.push({ name, ok, msg });
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  const en = extract(EN, marker);
  const zh = extract(ZH, marker);
  const exp = expectedFromData(DATA);

  add("floor: fields found", en.fields.length >= floor && zh.fields.length >= floor,
    `EN ${en.fields.length}, zh ${zh.fields.length} fields — expected ≥ ${floor}`);

  add("structure + defaults: EN", en.problems.length === 0, en.problems.join("\n    "));
  add("structure + defaults: zh", zh.problems.length === 0, zh.problems.join("\n    "));

  add("data file: well-formed (closesAt offset, option sets exist, unique codes)", exp.problems.length === 0, exp.problems.join("\n    "));

  const listDiff = (a, b) => {
    const d = [];
    for (let i = 0; i < Math.max(a.length, b.length); i++)
      if (a[i] !== b[i]) d.push(`#${i}: EN ${a[i]}\n      zh ${b[i]}`);
    return d;
  };
  const sigDiffs = listDiff(en.sigs, zh.sigs);
  add(`controls: every control + wrapper tag EN == zh (${en.sigs.length} tags)`, sigDiffs.length === 0, sigDiffs.slice(0, 5).join("\n    "));
  const skelDiffs = listDiff(en.skeleton, zh.skeleton);
  add(`skeleton: form tag structure EN == zh (${en.skeleton.length} tags)`, skelDiffs.length === 0, skelDiffs.slice(0, 5).join("\n    "));
  add("skeleton: external scripts EN == zh", same(en.srcScripts, zh.srcScripts),
    `EN [${en.srcScripts.join(", ")}]\n    zh [${zh.srcScripts.join(", ")}]`);

  add("fields: EN == zh (names, order)", same(en.fields, zh.fields),
    `EN [${en.fields.join(", ")}]\n    zh [${zh.fields.join(", ")}]`);
  add("fields: EN == data file", same(en.fields, exp.fields),
    `EN [${en.fields.join(", ")}]\n    data [${exp.fields.join(", ")}]`);

  const optDiffs = [];
  const dataDiffs = [];
  const typeDiffs = [];
  const encDiffs = [];
  for (const name of en.fields) {
    const a = en.byName.get(name);
    const b = zh.byName.get(name);
    if (b) {
      if (a.type !== b.type) optDiffs.push(`${name}: type ${a.type} vs ${b.type}`);
      if (!same(a.codes, b.codes)) optDiffs.push(`${name}: [${a.codes}] vs [${b.codes}]`);
    }
    if (name in exp.codes && !same(a.codes, exp.codes[name]))
      dataDiffs.push(`${name}: page [${a.codes}] vs data [${exp.codes[name]}]`);
    if (a.type !== exp.types[name]) typeDiffs.push(`${name}: page ${a.type} vs data ${exp.types[name] ?? "(not in data)"}`);
    for (const [label, p] of [["EN", a], ["zh", b]]) {
      if (!p) continue;
      const want = p.type === "checkbox" && name !== "botcheck";
      if (p.grouped.some((g) => g !== want)) encDiffs.push(`${label} ${name}: data-group ${want ? "missing" : "unexpected"}`);
      if (name in exp.grouped && exp.grouped[name] !== want) encDiffs.push(`${label} ${name}: data file says grouped=${exp.grouped[name]}`);
    }
  }
  add("fields: control types == data file", typeDiffs.length === 0, typeDiffs.join("\n    "));
  add("options: EN == zh (type, codes, order)", optDiffs.length === 0, optDiffs.join("\n    "));
  add("options: EN == data file", dataDiffs.length === 0, dataDiffs.join("\n    "));
  add("encoding: every checkbox group carries data-group (and no radio does)", encDiffs.length === 0, encDiffs.join("\n    "));

  const condDiffs = [];
  const condData = [];
  const condShape = [];
  for (const q of new Set([...Object.keys(en.conditions), ...Object.keys(zh.conditions)]))
    if (en.conditions[q] !== zh.conditions[q]) condDiffs.push(`${q}: ${en.conditions[q]} vs ${zh.conditions[q]}`);
  // A missing question wrapper reads as undefined, which never equals the data's null/string.
  for (const q of Object.keys(exp.conditions))
    if (en.conditions[q] !== exp.conditions[q]) condData.push(`${q}: page ${en.conditions[q]} vs data ${exp.conditions[q]}`);
  for (const [label, p] of [["EN", en], ["zh", zh]]) {
    for (const w of p.wrappers) {
      const q = w.a["data-q"];
      const cond = "data-show-if" in w.a;
      const e = p.byName.get(q);
      if (cond !== ("hidden" in w.a)) condShape.push(`${label} ${q}: ${cond ? "conditional but not hidden" : "hidden but unconditional"}`);
      if (e && e.disabled.some((d) => d !== cond)) condShape.push(`${label} ${q}: inputs ${cond ? "not all disabled" : "disabled"}`);
      if (!cond) continue;
      condShape.push(...condListProblems(label, q, w.a["data-show-if"], p.byName, "data-show-if"));
    }
  }
  for (const cyc of conditionCycles(en.conditions)) condShape.push(`EN condition cycle: ${cyc}`);
  for (const cyc of conditionCycles(zh.conditions)) condShape.push(`zh condition cycle: ${cyc}`);
  add("conditions: EN == zh", condDiffs.length === 0, condDiffs.join("\n    "));
  add("conditions: EN == data file", condData.length === 0, condData.join("\n    "));
  add("conditions: well-formed (non-empty anyOf of real codes; hidden + disabled iff conditional)", condShape.length === 0, condShape.join("\n    "));

  const hv = (p, n) => (p.byName.get(n) || {}).value;
  const hiddenDiffs = ["access_key", "from_name", "subject", "instrument"].filter((n) => hv(en, n) !== hv(zh, n));
  add("hidden: access_key/from_name/subject/instrument EN == zh", hiddenDiffs.length === 0, `differ: ${hiddenDiffs.join(", ")}`);
  add("hidden: values match data file",
    hv(en, "access_key") === DATA.accessKey && hv(en, "subject") === DATA.subject &&
      hv(en, "instrument") === DATA.instrument && hv(en, "from_name") === DATA.fromName,
    `access_key=${hv(en, "access_key")} subject=${hv(en, "subject")} instrument=${hv(en, "instrument")} from_name=${hv(en, "from_name")}`);
  add('hidden: lang = "en" / "zh"', hv(en, "lang") === "en" && hv(zh, "lang") === "zh",
    `EN lang=${hv(en, "lang")}, zh lang=${hv(zh, "lang")}`);

  add("close date: data-closes-at EN == zh == data file (ISO with offset)",
    en.closesAt === DATA.closesAt && zh.closesAt === DATA.closesAt && CLOSES_AT_RE.test(DATA.closesAt || "") && !Number.isNaN(Date.parse(DATA.closesAt)),
    `EN ${en.closesAt}, zh ${zh.closesAt}, data ${DATA.closesAt}`);

  add("scripts: questionnaire script present; every inline script identical EN == zh",
    en.script !== null && zh.script !== null && same(en.scripts, zh.scripts),
    en.script === null || zh.script === null ? "questionnaire script not found"
      : `EN has ${en.scripts.length} inline script(s), zh ${zh.scripts.length}; bodies differ`);

  if (inst.required) {
    const reqDiffs = [];
    const reqData = [];
    const reqShape = [];
    for (const q of new Set([...Object.keys(en.required), ...Object.keys(zh.required)]))
      if (en.required[q] !== zh.required[q]) reqDiffs.push(`${q}: ${en.required[q]} vs ${zh.required[q]}`);
    for (const q of Object.keys(exp.required))
      if (en.required[q] !== exp.required[q]) reqData.push(`${q}: page ${en.required[q]} vs data ${exp.required[q]}`);
    for (const [label, p, L] of [["EN", en, "en"], ["zh", zh, "zh"]]) {
      for (const m of p.reqMsgs)
        if (!p.wrappers.some((w) => m.index > w.start && m.index < w.end)) reqShape.push(`${label}: q-req-msg outside any question: ${m.a.id}`);
      for (const w of p.wrappers) {
        const q = w.a["data-q"];
        const msgs = p.reqMsgs.filter((m) => m.index > w.start && m.index < w.end);
        if (!("data-required-if" in w.a)) {
          if (msgs.length) reqShape.push(`${label} ${q}: required message without data-required-if`);
          continue;
        }
        reqShape.push(...condListProblems(label, q, w.a["data-required-if"], p.byName, "data-required-if"));
        const e = p.byName.get(q);
        if (e && (e.type === "checkbox" || e.type === "radio")) reqShape.push(`${label} ${q}: required-if on a choice question`);
        const key = exp.requiredMsg[q];
        const want = key && DATA.text[key] ? DATA.text[key][L] : undefined;
        if (want === undefined) reqShape.push(`${label} ${q}: data file names no message text (requiredMsg "${key}")`);
        if (msgs.length !== 1) { reqShape.push(`${label} ${q}: expected exactly one q-req-msg in its wrapper, found ${msgs.length}`); continue; }
        const m = msgs[0];
        if (m.a.id !== `${q}_req`) reqShape.push(`${label} ${q}: message id "${m.a.id}" should be "${q}_req"`);
        if (!("hidden" in m.a)) reqShape.push(`${label} ${q}: message not rendered hidden`);
        if (want !== undefined && m.text.trim() !== want) reqShape.push(`${label} ${q}: message "${m.text.trim()}" vs data "${want}"`);
      }
    }
    add("required: EN == zh", reqDiffs.length === 0, reqDiffs.join("\n    "));
    add("required: EN == data file", reqData.length === 0, reqData.join("\n    "));
    add("required: well-formed (real codes; text field; own hidden message in the page's language)", reqShape.length === 0, reqShape.join("\n    "));
    add(`draft key: data-draft-key EN == zh == data file == "${inst.draftKey}"`,
      en.draftKey === inst.draftKey && zh.draftKey === inst.draftKey && DATA.draftKey === inst.draftKey,
      `EN ${en.draftKey}, zh ${zh.draftKey}, data ${DATA.draftKey}`);
  }

  for (const r of results)
    console.log(`  ${r.ok ? GREEN("PASS") : RED("FAIL")}  ${r.name}${r.ok ? "" : "\n    " + r.msg}`);
  return results.every((r) => r.ok);
}

try {
  main();
} catch (e) {
  console.error(RED("Harness crashed: " + e.message));
  process.exit(2);
}
