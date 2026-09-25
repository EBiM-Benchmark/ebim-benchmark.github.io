// Questionnaire A EN/zh parity harness.
//
// The two questionnaire pages (_site/feedback-registered.html and
// _site/zh/feedback-registered.html) feed ONE dataset, so they must submit the
// same thing. Both render from src/_data/questionnaireA.json, but a template
// edit could still make them diverge; this reads the BUILT pages and fails if:
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
const EN = "feedback-registered.html";
const ZH = "zh/feedback-registered.html";
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
function attrs(tag) {
  const out = {};
  const body = tag.replace(/^<[a-zA-Z]+/, "").replace(/\/?>$/, "");
  for (const m of body.matchAll(/([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g))
    out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? "");
  return out;
}
const sig = (name, a, extra = "") =>
  `<${name} ${Object.keys(a).sort().map((k) => `${k}=${JSON.stringify(a[k])}`).join(" ")}>${extra}`;
// Conditions compare as parsed JSON, so re-spacing is not a difference.
const canon = (s) => { try { return JSON.stringify(JSON.parse(s)); } catch { return s; } };

// Everything the page submits and branches on, extracted from built HTML.
function extract(rel) {
  const raw = fs.readFileSync(path.join(SITE, rel), "utf8").replace(/\r\n/g, "\n");
  const scripts = [...raw.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((m) => { const a = attrs(`<script${m[1]}>`); return !("src" in a) && a.type !== "application/ld+json"; })
    .map((m) => m[2]);
  const marked = raw.match(/<!-- Questionnaire A:[^>]*-->\s*<script>([\s\S]*?)<\/script>/);
  // Comments and script bodies can hold tag-like text that submits nothing.
  const html = raw.replace(/<!--[\s\S]*?-->/g, "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");

  const forms = [...html.matchAll(tagRe("form"))].filter((m) => attrs(m[0]).id === "qForm");
  if (!forms.length) throw new Error(`${rel}: no <form id="qForm">`);
  const formStart = forms[0].index;
  const formEnd = html.indexOf("</form>", formStart);
  const formTag = attrs(forms[0][0]);

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
    if ("form" in a) problems.push(`control with form= attribute: ${m[0]}`);
    if (!inside) {
      if (a.name) problems.push(`named control outside #qForm: ${m[0]}`);
      continue;
    }
    let body = "";
    if (kind === "textarea") {
      const end = html.indexOf("</textarea>", m.index);
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
      e.codes.push(a.value ?? null);
      e.grouped.push("data-group" in a);
    } else {
      e.value = a.value ?? null;
      if (e.count > 1) problems.push(`${name}: repeated non-choice field`);
    }
  }
  for (const w of wrappers) sigs.push(sig("div", "data-show-if" in w.a ? { ...w.a, "data-show-if": canon(w.a["data-show-if"]) } : w.a));

  const conditions = {};
  for (const w of wrappers) {
    const q = w.a["data-q"];
    conditions[q] = "data-show-if" in w.a ? canon(w.a["data-show-if"]) : null;
    for (const n of w.names) if (n !== q) problems.push(`wrapper data-q="${q}" holds input name="${n}"`);
    if (!w.names.has(q)) problems.push(`wrapper data-q="${q}" holds no input named ${q}`);
  }

  return { fields, byName, conditions, wrappers, sigs, problems, scripts, closesAt: formTag["data-closes-at"], script: marked ? marked[1] : null };
}

// The same, derived from the data file (the spec as encoded).
function expectedFromData(DATA) {
  const fields = [];
  const codes = {};
  const grouped = {};
  const types = { ...HIDDEN_TYPES };
  const conditions = {};
  for (const sec of DATA.sections)
    for (const q of sec.questions) {
      fields.push(q.name);
      types[q.name] = RENDERS[q.type] || `unknown data type "${q.type}"`;
      const opts = typeof q.options === "string" ? DATA.optionSets[q.options] : q.options;
      if (q.type === "scale") {
        codes[q.name] = [];
        for (let v = q.min; v <= q.max; v++) codes[q.name].push(String(v));
      } else if (opts) codes[q.name] = opts.map((o) => o.code);
      grouped[q.name] = q.type === "checkbox" || q.type === "single";
      conditions[q.name] = q.showIf ? JSON.stringify(q.showIf) : null;
    }
  return { fields: [...fields, ...HIDDEN], codes, grouped, types, conditions };
}

function buildSite() {
  const r = spawnSync("npx", ["@11ty/eleventy", "--quiet"], { cwd: ROOT, stdio: "inherit", shell: true });
  if (r.status !== 0) throw new Error("eleventy build failed");
}

function main() {
  if (!process.argv.includes("--no-build")) buildSite();
  const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "src/_data/questionnaireA.json"), "utf8"));
  console.log(BOLD(`\nQuestionnaire A — EN/zh parity (${EN} vs ${ZH})\n`));

  const results = [];
  const add = (name, ok, msg = "") => results.push({ name, ok, msg });
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  const en = extract(EN);
  const zh = extract(ZH);
  const exp = expectedFromData(DATA);

  add("floor: fields found", en.fields.length >= 30 && zh.fields.length >= 30,
    `EN ${en.fields.length}, zh ${zh.fields.length} fields — expected ≥ 30`);

  add("structure + defaults: EN", en.problems.length === 0, en.problems.join("\n    "));
  add("structure + defaults: zh", zh.problems.length === 0, zh.problems.join("\n    "));

  const sigDiffs = [];
  for (let i = 0; i < Math.max(en.sigs.length, zh.sigs.length); i++)
    if (en.sigs[i] !== zh.sigs[i]) sigDiffs.push(`#${i}: EN ${en.sigs[i]}\n      zh ${zh.sigs[i]}`);
  add(`controls: every control + wrapper tag EN == zh (${en.sigs.length} tags)`, sigDiffs.length === 0, sigDiffs.slice(0, 5).join("\n    "));

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
      let list;
      try { list = JSON.parse(w.a["data-show-if"]); } catch { condShape.push(`${label} ${q}: data-show-if is not JSON`); continue; }
      if (!Array.isArray(list) || !list.length) { condShape.push(`${label} ${q}: data-show-if is not a non-empty list`); continue; }
      for (const c of list) {
        if (!c || typeof c.field !== "string" || !Array.isArray(c.anyOf) || !c.anyOf.length) {
          condShape.push(`${label} ${q}: condition must be {field, anyOf: [non-empty]}: ${JSON.stringify(c)}`);
          continue;
        }
        const t = p.byName.get(c.field);
        if (!t) { condShape.push(`${label} ${q}: condition on unknown field ${c.field}`); continue; }
        if (t.type !== "checkbox" && t.type !== "radio") condShape.push(`${label} ${q}: condition on non-choice field ${c.field}`);
        for (const code of c.anyOf) if (!t.codes.includes(code)) condShape.push(`${label} ${q}: ${c.field} has no code "${code}"`);
      }
    }
  }
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

  add("close date: data-closes-at EN == zh == data file",
    en.closesAt === DATA.closesAt && zh.closesAt === DATA.closesAt && !Number.isNaN(Date.parse(DATA.closesAt)),
    `EN ${en.closesAt}, zh ${zh.closesAt}, data ${DATA.closesAt}`);

  add("scripts: questionnaire script present; every inline script identical EN == zh",
    en.script !== null && zh.script !== null && same(en.scripts, zh.scripts),
    en.script === null || zh.script === null ? "questionnaire script not found"
      : `EN has ${en.scripts.length} inline script(s), zh ${zh.scripts.length}; bodies differ`);

  for (const r of results)
    console.log(`  ${r.ok ? GREEN("PASS") : RED("FAIL")}  ${r.name}${r.ok ? "" : "\n    " + r.msg}`);
  const ok = results.every((r) => r.ok);
  console.log("\n" + (ok ? GREEN(BOLD("✓ QUESTIONNAIRE PARITY PASSED")) : RED(BOLD("✗ QUESTIONNAIRE PARITY FAILED"))) + "\n");
  process.exit(ok ? 0 : 1);
}

try {
  main();
} catch (e) {
  console.error(RED("Harness crashed: " + e.message));
  process.exit(2);
}
