// Questionnaire A EN/zh parity harness.
//
// The two questionnaire pages (_site/feedback-registered.html and
// _site/zh/feedback-registered.html) feed ONE dataset, so they must submit the
// same thing. Both render from src/_data/questionnaireA.json, but a template
// edit could still make them diverge; this reads the BUILT pages and fails if
// they differ in:
//
//   fields      — the ordered list of submitted field names (every named
//                 <input>/<textarea> inside #qForm; a checkbox group counts once).
//   options     — each choice field's type and option codes, in order.
//   conditions  — each question's data-show-if condition.
//   hidden      — access_key / from_name / subject / instrument identical;
//                 lang is exactly "en" on EN and "zh" on zh.
//   script      — the inline questionnaire script is byte-identical.
//
// It also checks the EN page against the data file itself (same field list,
// codes and conditions) so the two pages cannot pass by being broken the same
// way, and a floor: a page with no fields is a broken instrument, not a pass.
//
// Usage:  node scripts/verify-questionnaire.mjs            (builds, then verifies)
//         node scripts/verify-questionnaire.mjs --no-build (verify an existing _site)
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const SITE = path.join(ROOT, "_site");
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "src/_data/questionnaireA.json"), "utf8"));
const EN = "feedback-registered.html";
const ZH = "zh/feedback-registered.html";
const HIDDEN = ["access_key", "from_name", "subject", "instrument", "lang", "botcheck"];

const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;

const decode = (s) =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? decode(m[1]) : null;
};

// Everything the pages submit and branch on, extracted from built HTML.
function extract(rel) {
  const html = fs.readFileSync(path.join(SITE, rel), "utf8");
  const f = html.match(/<form id="qForm"[\s\S]*?<\/form>/);
  if (!f) throw new Error(`${rel}: no <form id="qForm">`);
  const form = f[0];

  const fields = [];
  const byName = new Map();
  for (const m of form.matchAll(/<(input|textarea)\b[^>]*>/g)) {
    const tag = m[0];
    const name = attr(tag, "name");
    if (!name) continue;
    const type = m[1] === "textarea" ? "textarea" : attr(tag, "type") || "text";
    if (!byName.has(name)) {
      byName.set(name, { type, codes: [], value: null });
      fields.push(name);
    }
    const e = byName.get(name);
    if (type === "checkbox" || type === "radio") e.codes.push(attr(tag, "value"));
    else e.value = attr(tag, "value");
  }

  const conditions = {};
  for (const m of form.matchAll(/<div class="q" data-q="([^"]+)"[^>]*>/g)) {
    conditions[m[1]] = attr(m[0], "data-show-if");
  }

  const s = html.match(/<!-- Questionnaire A:[^>]*-->\s*<script>([\s\S]*?)<\/script>/);
  return { fields, byName, conditions, script: s ? s[1] : null };
}

// The same, derived from the data file (the spec as encoded).
function expectedFromData() {
  const fields = [];
  const codes = {};
  const conditions = {};
  for (const sec of DATA.sections)
    for (const q of sec.questions) {
      fields.push(q.name);
      const opts = typeof q.options === "string" ? DATA.optionSets[q.options] : q.options;
      if (q.type === "scale") {
        codes[q.name] = [];
        for (let v = q.min; v <= q.max; v++) codes[q.name].push(String(v));
      } else if (opts) codes[q.name] = opts.map((o) => o.code);
      conditions[q.name] = q.showIf ? JSON.stringify(q.showIf) : null;
    }
  return { fields: [...fields, ...HIDDEN], codes, conditions };
}

function buildSite() {
  const r = spawnSync("npx", ["@11ty/eleventy", "--quiet"], { cwd: ROOT, stdio: "inherit", shell: true });
  if (r.status !== 0) throw new Error("eleventy build failed");
}

function main() {
  if (!process.argv.includes("--no-build")) buildSite();
  console.log(BOLD(`\nQuestionnaire A — EN/zh parity (${EN} vs ${ZH})\n`));

  const results = [];
  const add = (name, ok, msg = "") => results.push({ name, ok, msg });

  const en = extract(EN);
  const zh = extract(ZH);
  const exp = expectedFromData();

  add("floor: fields found", en.fields.length >= 30 && zh.fields.length >= 30,
    `EN ${en.fields.length}, zh ${zh.fields.length} fields — expected ≥ 30`);

  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  add("fields: EN == zh (names, order)", same(en.fields, zh.fields),
    `EN [${en.fields.join(", ")}]\n    zh [${zh.fields.join(", ")}]`);
  add("fields: EN == data file", same(en.fields, exp.fields),
    `EN [${en.fields.join(", ")}]\n    data [${exp.fields.join(", ")}]`);

  const optDiffs = [];
  const dataDiffs = [];
  for (const name of en.fields) {
    const a = en.byName.get(name);
    const b = zh.byName.get(name);
    if (!b) continue;
    if (a.type !== b.type) optDiffs.push(`${name}: type ${a.type} vs ${b.type}`);
    if (!same(a.codes, b.codes)) optDiffs.push(`${name}: [${a.codes}] vs [${b.codes}]`);
    if (name in exp.codes && !same(a.codes, exp.codes[name]))
      dataDiffs.push(`${name}: page [${a.codes}] vs data [${exp.codes[name]}]`);
  }
  add("options: EN == zh (type, codes, order)", optDiffs.length === 0, optDiffs.join("\n    "));
  add("options: EN == data file", dataDiffs.length === 0, dataDiffs.join("\n    "));

  const condDiffs = [];
  const condData = [];
  for (const q of new Set([...Object.keys(en.conditions), ...Object.keys(zh.conditions)])) {
    if (en.conditions[q] !== zh.conditions[q]) condDiffs.push(`${q}: ${en.conditions[q]} vs ${zh.conditions[q]}`);
  }
  for (const q of Object.keys(exp.conditions)) {
    // A missing question wrapper reads as undefined, which never equals the data's null/string.
    if (en.conditions[q] !== exp.conditions[q])
      condData.push(`${q}: page ${en.conditions[q]} vs data ${exp.conditions[q]}`);
  }
  add("conditions: EN == zh", condDiffs.length === 0, condDiffs.join("\n    "));
  add("conditions: EN == data file", condData.length === 0, condData.join("\n    "));

  const hv = (p, n) => (p.byName.get(n) || {}).value;
  const hiddenDiffs = ["access_key", "from_name", "subject", "instrument"].filter((n) => hv(en, n) !== hv(zh, n));
  add("hidden: access_key/from_name/subject/instrument EN == zh", hiddenDiffs.length === 0, `differ: ${hiddenDiffs.join(", ")}`);
  add("hidden: values match data file",
    hv(en, "access_key") === DATA.accessKey && hv(en, "subject") === DATA.subject &&
      hv(en, "instrument") === DATA.instrument && hv(en, "from_name") === DATA.fromName,
    `access_key=${hv(en, "access_key")} subject=${hv(en, "subject")} instrument=${hv(en, "instrument")} from_name=${hv(en, "from_name")}`);
  add('hidden: lang = "en" / "zh"', hv(en, "lang") === "en" && hv(zh, "lang") === "zh",
    `EN lang=${hv(en, "lang")}, zh lang=${hv(zh, "lang")}`);

  add("script: inline questionnaire script present and identical",
    en.script !== null && en.script === zh.script, en.script === null ? "script not found" : "EN and zh script bodies differ");

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
