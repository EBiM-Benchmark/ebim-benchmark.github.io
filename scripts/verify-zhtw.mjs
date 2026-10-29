// /zh-tw/ locale harness — four gates over the built Traditional-Chinese (Taiwan)
// pages. zh-TW copy is hand-translated from EN (docs/i18n/zh-TW-termbase.md);
// each built _site/zh-tw/<f> is checked against the zh page at _site/zh/<f>,
// which is its markup template. Only pages that EXIST under _site/zh-tw/ are
// checked, so the gates grow with the tree as pages are drafted.
//
//   A  skeleton parity — the two pages are the same document once every
//      translatable run is masked. Removed first (both sides): <link
//      rel="alternate">, <meta name="robots">, the <li class="nav-lang"> subtree
//      (each with the newline + indent before it, so a published zh page and a
//      zh-TW draft line up). Ignored: html@lang, meta[og:locale]@content.
//      Attribute values: /zh-tw/ → /zh/, then Han → ◇, else exact. Text and
//      comments: Han → ◇, else exact (whitespace included). Inline scripts:
//      /zh-tw/ → /zh/, Han string literals → "◇", then exact. <style>: exact.
//      JSON-LD: every string mapped like an attribute value, then deep-equal.
//   B  fact-token parity — after the same removals, the multiset of numbers,
//      emails and URLs in text, attribute values (/zh-tw/ → /zh/) and JSON-LD
//      strings is equal on both sides. Exceptions: scripts/zhtw-fact-exceptions.json
//      ([{ page, zh, zhTw, reason }]); never add one without Cecil's sign-off.
//   C  lexicon lint — over every zh-TW page (text, attributes, comments, inline
//      script string literals, JSON-LD strings) and every string in
//      src/_data/i18n/zh-tw.json: (1) the deny regexes in scripts/zhtw-lexicon.json
//      must not match; (2) each Han string is an OpenCC (cn → twp) fixed point.
//      Exceptions to both: `allow` in the same file ([{ page, text, reason }];
//      page "*" = any page). A finding is waived when its span lies inside an
//      occurrence of `text`. Additions need Cecil's ratification.
//   D  chrome key parity — zh-tw.json has exactly zh.json's key paths, with the
//      same value types and array lengths.
//
// --self-test proves every gate can fail (and that the clean pair passes A and B)
// before any result is trusted.
//
// Usage:  node scripts/verify-zhtw.mjs            (builds, then verifies)
//         node scripts/verify-zhtw.mjs --no-build (verify an existing _site)
//         node scripts/verify-zhtw.mjs --self-test
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseDocument } from "htmlparser2";
import * as OpenCC from "opencc-js";

const ROOT = process.cwd();
const SITE = path.join(ROOT, "_site");
const TW_DIR = path.join(SITE, "zh-tw");
const ZH_JSON = "src/_data/i18n/zh.json";
const TW_JSON = "src/_data/i18n/zh-tw.json";
const LEXICON = "scripts/zhtw-lexicon.json";
const FACT_EXCEPTIONS = "scripts/zhtw-fact-exceptions.json";

const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;

const HAN = /\p{Script=Han}/u;
const MASK = "◇";
const toCn = (s) => s.replaceAll("/zh-tw/", "/zh/");
const maskHan = (s) => (HAN.test(s) ? MASK : s);
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const toTw = OpenCC.Converter({ from: "cn", to: "twp" });

// ─────────────────────────────────────────────────────────────── DOM helpers ──
const isEl = (n) => n.type === "tag" || n.type === "script" || n.type === "style";
const tokensOf = (v) => (v || "").toLowerCase().split(/\s+/).filter(Boolean);
const textOf = (n) => (n.children || []).map((c) => (c.type === "text" ? c.data : textOf(c))).join("");
const isJsonLd = (n) => n.name === "script" && (n.attribs.type || "").toLowerCase() === "application/ld+json";
const isInlineScript = (n) => n.name === "script" && !isJsonLd(n) && !("src" in n.attribs);
const label = (n) =>
  n.name + (n.attribs.id ? `#${n.attribs.id}` : "") + (n.attribs.class ? `.${tokensOf(n.attribs.class)[0]}` : "");

const removable = (n) =>
  isEl(n) &&
  ((n.name === "link" && tokensOf(n.attribs.rel).includes("alternate")) ||
    (n.name === "meta" && (n.attribs.name || "").toLowerCase() === "robots") ||
    (n.name === "li" && tokensOf(n.attribs.class).includes("nav-lang")));

// Removes the Gate A/B elements in place, each with the newline + indent that
// precedes it (the conditional tags are each emitted on their own line).
function strip(node) {
  const kids = node.children || [];
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    if (removable(k)) {
      const prev = kids[i - 1];
      if (prev && prev.type === "text") prev.data = prev.data.replace(/\n[ \t]*$/, "");
      kids.splice(i--, 1);
    } else strip(k);
  }
  return node;
}

const parse = (html) => parseDocument(html);
const read = (f) => fs.readFileSync(f, "utf8");

// JS string literals ('…', "…", `…`). Good enough for the site's inline scripts,
// which carry no regex literals containing quotes.
const JS_STRING = /'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g;

const mapStrings = (v, f) =>
  typeof v === "string"
    ? f(v)
    : Array.isArray(v)
      ? v.map((x) => mapStrings(x, f))
      : v && typeof v === "object"
        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapStrings(x, f)]))
        : v;
const canon = (v) =>
  Array.isArray(v)
    ? `[${v.map(canon).join(",")}]`
    : v && typeof v === "object"
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canon(v[k])}`)
          .join(",")}}`
      : JSON.stringify(v);
const jsonStrings = (v, out = []) => {
  if (typeof v === "string") out.push(v);
  else if (v && typeof v === "object") for (const x of Object.values(v)) jsonStrings(x, out);
  return out;
};
const parseLd = (raw) => {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false, value: raw };
  }
};

// ───────────────────────────────────────────────────── Gate A — skeleton ──
function skeleton(doc) {
  const out = [];
  let pendingText = null;
  const flush = () => {
    if (pendingText) out.push({ path: pendingText.path, tok: `#text ${JSON.stringify(maskHan(pendingText.raw))}` });
    pendingText = null;
  };
  const walk = (node, p) => {
    for (const n of node.children || []) {
      if (n.type === "text") {
        if (pendingText) pendingText.raw += n.data;
        else pendingText = { path: p, raw: n.data };
        continue;
      }
      flush();
      if (n.type === "comment") out.push({ path: p, tok: `#comment ${JSON.stringify(maskHan(n.data))}` });
      else if (n.type === "directive") out.push({ path: p, tok: `#directive ${n.data}` });
      else if (isEl(n)) {
        const np = `${p} > ${label(n)}`;
        const attrs = Object.entries(n.attribs).map(([k, v]) => {
          const ignored =
            (n.name === "html" && k === "lang") ||
            (n.name === "meta" && k === "content" && (n.attribs.property || "") === "og:locale");
          return `${k}=${ignored ? "∅" : JSON.stringify(maskHan(toCn(v)))}`;
        });
        out.push({ path: np, tok: `<${n.name}${attrs.length ? " " + attrs.join(" ") : ""}>` });
        if (isJsonLd(n)) {
          const ld = parseLd(textOf(n));
          out.push({
            path: np,
            tok: ld.ok ? `#json-ld ${canon(mapStrings(ld.value, (s) => maskHan(toCn(s))))}` : `#json-ld INVALID ${ld.value}`,
          });
        } else if (isInlineScript(n)) {
          const js = toCn(textOf(n)).replace(JS_STRING, (lit) => (HAN.test(lit) ? `"${MASK}"` : lit));
          out.push({ path: np, tok: `#script ${JSON.stringify(js)}` });
        } else if (n.name === "style" || n.name === "script") {
          out.push({ path: np, tok: `#${n.name} ${JSON.stringify(textOf(n))}` });
        } else walk(n, np);
        out.push({ path: np, tok: `</${n.name}>` });
      }
    }
    flush();
  };
  walk(doc, "");
  return out;
}

// Mutates both documents (strip). Returns { ok, detail }.
function gateA(zhDoc, twDoc) {
  const a = skeleton(strip(zhDoc));
  const b = skeleton(strip(twDoc));
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i]?.tok !== b[i]?.tok) {
      const cut = (t) => (t === undefined ? "(end of document)" : t.length > 160 ? t.slice(0, 160) + "…" : t);
      return {
        ok: false,
        detail:
          `token ${i} at ${(b[i] || a[i]).path || "(root)"}\n` +
          `          zh    : ${cut(a[i]?.tok)}\n` +
          `          zh-TW : ${cut(b[i]?.tok)}`,
      };
    }
  }
  return { ok: true, detail: `${a.length} tokens` };
}

// ───────────────────────────────────────────────── Gate B — fact tokens ──
const FACT_RES = [
  ["url", /https?:\/\/[^\s"'<>）]+/g],
  ["email", /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g],
  ["number", /\d+(?:[.,:/–-]\d+)*/g],
];

function factBag(doc) {
  const bag = new Map();
  const add = (s) => {
    for (const [kind, re] of FACT_RES)
      for (const m of s.matchAll(re)) bag.set(`${kind} ${m[0]}`, (bag.get(`${kind} ${m[0]}`) || 0) + 1);
  };
  const walk = (node) => {
    for (const n of node.children || []) {
      if (n.type === "text") add(n.data);
      else if (isEl(n)) {
        for (const v of Object.values(n.attribs)) add(toCn(v));
        if (isJsonLd(n)) {
          const ld = parseLd(textOf(n));
          if (ld.ok) jsonStrings(ld.value).forEach((s) => add(toCn(s)));
          else add(ld.value);
        } else if (n.name !== "style") walk(n);
      }
    }
  };
  walk(strip(doc));
  return bag;
}

// Mutates both documents (strip). Returns { ok, detail }.
function gateB(zhDoc, twDoc, page, exceptions) {
  const zh = factBag(zhDoc);
  const tw = factBag(twDoc);
  const take = (bag, tok) => {
    for (const k of bag.keys())
      if (k.slice(k.indexOf(" ") + 1) === tok) {
        bag.set(k, bag.get(k) - 1);
        return;
      }
  };
  for (const e of exceptions.filter((x) => x.page === page)) {
    if (e.zh) take(zh, e.zh);
    if (e.zhTw) take(tw, e.zhTw);
  }
  const diffs = [];
  for (const k of new Set([...zh.keys(), ...tw.keys()])) {
    const a = zh.get(k) || 0;
    const b = tw.get(k) || 0;
    if (a !== b) diffs.push(`${k}   zh ×${a}  zh-TW ×${b}`);
  }
  const total = [...tw.values()].reduce((s, x) => s + x, 0);
  return diffs.length ? { ok: false, detail: diffs.join("\n          ") } : { ok: true, detail: `${total} tokens` };
}

// ────────────────────────────────────────────────── Gate C — lexicon lint ──
// Every string Gate C reads from a page: { where, text }.
function pageStrings(doc) {
  const out = [];
  const walk = (node, p) => {
    for (const n of node.children || []) {
      if (n.type === "text") out.push({ where: p, text: n.data });
      else if (n.type === "comment") out.push({ where: `${p} <!-- -->`, text: n.data });
      else if (isEl(n)) {
        const np = `${p} > ${label(n)}`;
        for (const [k, v] of Object.entries(n.attribs)) out.push({ where: `${np} @${k}`, text: v });
        if (isJsonLd(n)) {
          const ld = parseLd(textOf(n));
          (ld.ok ? jsonStrings(ld.value) : [ld.value]).forEach((s) => out.push({ where: `${np} json-ld`, text: s }));
        } else if (isInlineScript(n)) {
          for (const m of textOf(n).matchAll(JS_STRING)) out.push({ where: `${np} js-string`, text: m[0] });
        } else if (n.name !== "style" && n.name !== "script") walk(n, np);
      }
    }
  };
  walk(doc, "");
  return out;
}

function jsonFileStrings(obj, p = "") {
  if (typeof obj === "string") return [{ where: p, text: obj }];
  if (obj && typeof obj === "object")
    return Object.entries(obj).flatMap(([k, v]) => jsonFileStrings(v, Array.isArray(obj) ? `${p}[${k}]` : p ? `${p}.${k}` : k));
  return [];
}

// Differing spans between s and its conversion, with 10 chars of context.
function convDiffs(s, c) {
  const spans = [];
  if (s.length === c.length) {
    for (let i = 0; i < s.length; i++) {
      if (s[i] === c[i]) continue;
      let j = i;
      while (j < s.length && s[j] !== c[j]) j++;
      spans.push([i, j, c.slice(i, j)]);
      i = j;
    }
  } else {
    let a = 0;
    while (a < s.length && s[a] === c[a]) a++;
    let b = 0;
    while (b < s.length - a && s[s.length - 1 - b] === c[c.length - 1 - b]) b++;
    spans.push([a, s.length - b, c.slice(a, c.length - b)]);
  }
  return spans;
}

const ctx = (s, i, j, repl) =>
  `…${s.slice(Math.max(0, i - 10), i)}[${s.slice(i, j)}${repl === undefined ? "" : " → " + repl}]${s.slice(j, j + 10)}…`.replace(
    /\s+/g,
    " ",
  );

// waivedCounts (optional): array indexed like lexicon.allow, incremented per waived finding.
function lintStrings(strings, page, lexicon, waivedCounts = []) {
  const deny = lexicon.deny.map((d) => ({ ...d, re: new RegExp(d.pattern, "gu") }));
  const waived = (s, i, j) => {
    const n = lexicon.allow.findIndex((a) => {
      if (a.page !== page && a.page !== "*") return false;
      for (let k = s.indexOf(a.text); k !== -1; k = s.indexOf(a.text, k + 1)) if (k <= i && j <= k + a.text.length) return true;
      return false;
    });
    if (n !== -1) waivedCounts[n] = (waivedCounts[n] || 0) + 1;
    return n !== -1;
  };
  const findings = [];
  for (const { where, text } of strings) {
    for (const d of deny)
      for (const m of text.matchAll(d.re)) {
        const [i, j] = [m.index, m.index + m[0].length];
        if (!waived(text, i, j))
          findings.push({ kind: "deny", rule: `${d.pattern} (${d.termbase})`, where, span: text.slice(i, j), context: ctx(text, i, j) });
      }
    if (HAN.test(text)) {
      const c = toTw(text);
      if (c !== text)
        for (const [i, j, repl] of convDiffs(text, c))
          if (!waived(text, i, j))
            findings.push({ kind: "opencc", rule: "cn→twp fixed point", where, span: text.slice(i, j), context: ctx(text, i, j, repl) });
    }
  }
  return findings;
}

const gateC = (doc, page, lexicon, waivedCounts) => lintStrings(pageStrings(doc), page, lexicon, waivedCounts);

// ────────────────────────────────────────────── Gate D — chrome key parity ──
function shape(v, p = "", out = new Map()) {
  if (Array.isArray(v)) {
    out.set(p, `array(${v.length})`);
    v.forEach((x, i) => shape(x, `${p}[${i}]`, out));
  } else if (v && typeof v === "object") {
    out.set(p || "(root)", "object");
    for (const [k, x] of Object.entries(v)) shape(x, p ? `${p}.${k}` : k, out);
  } else out.set(p, v === null ? "null" : typeof v);
  return out;
}

function gateD(zhObj, twObj) {
  const a = shape(zhObj);
  const b = shape(twObj);
  const errs = [];
  for (const [k, t] of a) {
    if (!b.has(k)) errs.push(`missing in zh-tw.json: ${k}`);
    else if (b.get(k) !== t) errs.push(`type mismatch at ${k}: zh ${t}, zh-tw ${b.get(k)}`);
  }
  for (const k of b.keys()) if (!a.has(k)) errs.push(`extra in zh-tw.json: ${k}`);
  return errs.length ? { ok: false, detail: errs.join("\n      ") } : { ok: true, detail: `${a.size} key paths` };
}

// ──────────────────────────────────────────────────────────────── files ──
function twPages() {
  if (!fs.existsSync(TW_DIR)) return [];
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".html")) out.push(path.relative(TW_DIR, p).split(path.sep).join("/"));
    }
  };
  walk(TW_DIR);
  return out.sort();
}
const twFile = (rel) => path.join(TW_DIR, rel);
const zhFile = (rel) => path.join(SITE, "zh", rel);

// ──────────────────────────────────────────────────────────────── self-test ──
function selfTest() {
  console.log(BOLD("\nZH-TW SELF-TEST — proving each gate can fail\n"));
  const pages = twPages();
  if (!pages.length) {
    console.log(RED("  ✗ no _site/zh-tw/*.html to seed from (did the build run?)"));
    return false;
  }
  const rel = pages.includes("contact.html") ? "contact.html" : pages[0];
  const zhHtml = read(zhFile(rel));
  const twHtml = read(twFile(rel));
  const lexicon = readJson(LEXICON);
  const twJson = readJson(TW_JSON);
  const zhJson = readJson(ZH_JSON);
  console.log(`  seed pair: zh/${rel} ↔ zh-tw/${rel}\n`);

  let ok = true;
  const expect = (name, cond) => {
    console.log(`  ${cond ? GREEN("PASS") : RED("FAIL")}  ${name}`);
    if (!cond) ok = false;
  };

  // Controls: the unmodified pair must pass A and B, or a failure below proves nothing.
  expect("control: clean pair passes Gate A", gateA(parse(zhHtml), parse(twHtml)).ok);
  expect("control: clean pair passes Gate B", gateB(parse(zhHtml), parse(twHtml), `zh-tw/${rel}`, []).ok);

  // A1 — an injected element.
  expect("A fails on an injected <div>", !gateA(parse(zhHtml), parse(twHtml.replace("</main>", "<div></div></main>"))).ok);

  // A2 — one class attribute changed.
  {
    const doc = parse(twHtml);
    const find = (n) => {
      for (const c of n.children || []) {
        if (isEl(c) && c.name !== "head" && "class" in c.attribs && c.attribs.class) return c;
        const r = isEl(c) && c.name !== "head" ? find(c) : null;
        if (r) return r;
      }
      return null;
    };
    const el = find(doc);
    el.attribs.class += "-selftest";
    expect(`A fails on a changed class attribute (${el.name}.${el.attribs.class})`, !gateA(parse(zhHtml), doc).ok);
  }

  // B — one digit changed in a text node.
  {
    const doc = parse(twHtml);
    let hit = null;
    const find = (n) => {
      for (const c of n.children || []) {
        if (hit) return;
        if (c.type === "text" && /\d/.test(c.data)) hit = c;
        else if (isEl(c) && c.name !== "script" && c.name !== "style") find(c);
      }
    };
    find(doc);
    const before = hit.data.trim().slice(0, 40);
    hit.data = hit.data.replace(/\d/, (d) => String((+d + 1) % 10));
    expect(`B fails on one changed digit ("${before}")`, !gateB(parse(zhHtml), doc, `zh-tw/${rel}`, []).ok);
  }

  // C — 仿真 (denylist, A3) and 软件 (Simplified; OpenCC rewrites it to 軟體).
  {
    const doc = parse(twHtml);
    let hit = null;
    const find = (n) => {
      for (const c of n.children || []) {
        if (hit) return;
        if (c.type === "text" && HAN.test(c.data)) hit = c;
        else if (isEl(c) && c.name !== "script" && c.name !== "style" && c.name !== "head") find(c);
      }
    };
    find(doc);
    hit.data += "仿真软件，舞台";
    const f = gateC(doc, `zh-tw/${rel}`, lexicon);
    expect("C flags injected 仿真 (denylist)", f.some((x) => x.kind === "deny" && x.span === "仿真"));
    expect("C flags injected 软件 (OpenCC fixed point)", f.some((x) => x.kind === "opencc" && x.span.includes("软件")));
    // Allow entries are word-scoped: the 平台 waiver must not cover 台 in another word.
    expect("C still flags 台 in 舞台 (allowlist is word-scoped)", f.some((x) => x.kind === "opencc" && x.context.includes("舞[台")));
    const zhFindings = gateC(parse(read(zhFile("contact.html"))), "zh/contact.html", lexicon).length;
    expect(`C flags ≥ 20 findings on _site/zh/contact.html (${zhFindings})`, zhFindings >= 20);
  }

  // D — one key deleted.
  {
    const broken = structuredClone(twJson);
    delete broken.nav.home;
    expect("D fails when nav.home is deleted", !gateD(zhJson, broken).ok);
  }

  console.log(ok ? GREEN(BOLD("\n✓ ZH-TW SELF-TEST PASSED\n")) : RED(BOLD("\n✗ ZH-TW SELF-TEST FAILED\n")));
  return ok;
}

// ───────────────────────────────────────────────────────────────────── main ──
function main() {
  console.log(BOLD("\nVerifying _site/zh-tw against _site/zh (zh-TW gates A–D)\n"));
  const lexicon = readJson(LEXICON);
  const exceptions = readJson(FACT_EXCEPTIONS);
  const pages = twPages();
  const fails = [];
  const waivedCounts = [];
  let allOk = true;

  if (!pages.length) {
    console.log(RED("  ✗ no _site/zh-tw/*.html found (did the build run?)"));
    allOk = false;
  }

  const W = [36, 8, 8, 10];
  // Pads on the visible width, so colored cells still line up.
  const row = (cells) =>
    "  " + cells.map((c, i) => String(c) + " ".repeat(Math.max(1, W[i] - String(c).replace(/\x1b\[[0-9;]*m/g, "").length))).join("");
  console.log(BOLD(row(["page", "A", "B", "C"])));
  for (const rel of pages) {
    const page = `zh-tw/${rel}`;
    if (!fs.existsSync(zhFile(rel))) {
      console.log(row([page, RED("FAIL"), RED("FAIL"), "—"]));
      fails.push(`${page}: no zh counterpart at _site/zh/${rel}`);
      allOk = false;
      continue;
    }
    const zhHtml = read(zhFile(rel));
    const twHtml = read(twFile(rel));
    const a = gateA(parse(zhHtml), parse(twHtml));
    const b = gateB(parse(zhHtml), parse(twHtml), page, exceptions);
    const c = gateC(parse(twHtml), page, lexicon, waivedCounts);
    console.log(row([page, a.ok ? GREEN("PASS") : RED("FAIL"), b.ok ? GREEN("PASS") : RED("FAIL"), c.length ? RED(`FAIL (${c.length})`) : GREEN("PASS")]));
    if (!a.ok) fails.push(`${page} — Gate A skeleton: ${a.detail}`);
    if (!b.ok) fails.push(`${page} — Gate B fact tokens:\n          ${b.detail}`);
    for (const f of c) fails.push(`${page} — Gate C ${f.kind} [${f.rule}] ${f.where}\n          ${f.context}`);
    if (!a.ok || !b.ok || c.length) allOk = false;
  }

  if (!fs.existsSync(path.join(ROOT, TW_JSON))) {
    fails.push(`${TW_JSON} is missing (Gates C and D need it)`);
    console.log(row([TW_JSON, "—", "—", RED("MISSING")]));
    console.log(RED(BOLD("\n✗ ZH-TW CHECKS FAILED")));
    for (const f of fails) console.log("  • " + f);
    return false;
  }
  const twJson = readJson(TW_JSON);
  const cj = lintStrings(jsonFileStrings(twJson), TW_JSON, lexicon, waivedCounts);
  console.log(row([TW_JSON, "—", "—", cj.length ? RED(`FAIL (${cj.length})`) : GREEN("PASS")]));
  for (const f of cj) fails.push(`${TW_JSON} — Gate C ${f.kind} [${f.rule}] ${f.where}\n          ${f.context}`);
  if (cj.length) allOk = false;

  // Every allow entry and how many Gate C findings it waived across the run, so a
  // ratified exception that silently grows (or goes dead) is visible in the log.
  const totalWaived = waivedCounts.reduce((s, x) => s + (x || 0), 0);
  console.log(`\n  Gate C allowlist — ${totalWaived} finding(s) waived:`);
  lexicon.allow.forEach((a, i) => console.log(`    ${String(waivedCounts[i] || 0).padStart(4)} × page ${a.page}  text ${a.text}`));

  const d = gateD(readJson(ZH_JSON), twJson);
  console.log(`\n  ${d.ok ? GREEN("PASS") : RED("FAIL")}  Gate D — zh-tw.json key paths match zh.json (${d.ok ? d.detail : "see below"})`);
  if (!d.ok) {
    fails.push(`Gate D:\n      ${d.detail}`);
    allOk = false;
  }
  console.log("");

  if (fails.length) {
    console.log(BOLD("Failures"));
    for (const f of fails) console.log("  • " + f);
    console.log("");
  }
  console.log(allOk ? GREEN(BOLD("✓ ALL ZH-TW CHECKS PASSED")) : RED(BOLD("✗ ZH-TW CHECKS FAILED")));
  return allOk;
}

const args = process.argv.slice(2);
if (!args.includes("--no-build") && !args.includes("--self-test")) {
  const b = spawnSync("npx", ["@11ty/eleventy"], { stdio: "inherit", shell: true });
  if (b.status !== 0) process.exit(b.status ?? 1);
}
process.exit((args.includes("--self-test") ? selfTest() : main()) ? 0 : 1);
