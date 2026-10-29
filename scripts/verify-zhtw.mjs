// /zh-tw/ locale harness — four gates over the built Traditional-Chinese (Taiwan)
// pages. zh-TW copy is hand-translated from EN (docs/i18n/zh-TW-termbase.md);
// each built _site/zh-tw/<f> is checked against the zh page at _site/zh/<f>,
// which is its markup template. Only pages that EXIST under _site/zh-tw/ are
// checked, so the gates grow with the tree as pages are drafted.
//
//   A  skeleton parity — MARKUP only: the two pages are the same document once
//      all prose is masked, whatever its script (a zh node in Chinese may be
//      Latin in zh-TW, e.g. 领英 → LinkedIn). Removed first (both sides): <link
//      rel="alternate">, <meta name="robots">, the <li class="nav-lang"> subtree
//      (each with the newline + indent before it, so a published zh page and a
//      zh-TW draft line up). Ignored: html@lang, meta[og:locale]@content.
//      Masked regardless of script: every non-whitespace text node and comment;
//      the text-bearing attributes (TEXT_ATTRS) and the content of the text
//      metas (TEXT_META). Every other attribute — tag names, ids, classes,
//      href/src (after /zh-tw/ → /zh/), form name/value, data-* — is compared
//      exactly, except that a value containing Han (a translated data-msg-*
//      string, say) is masked. Whitespace-only text: exact. Inline scripts:
//      /zh-tw/ → /zh/, Han string literals → "◇", then exact. <style>: exact.
//      JSON-LD: every string /zh-tw/ → /zh/ then Han → ◇, then deep-equal.
//   B  fact-token parity — after the same removals, the multiset of numbers,
//      emails and URLs in text, attribute values (/zh-tw/ → /zh/) and JSON-LD
//      strings is equal on both sides. Exceptions: scripts/zhtw-fact-exceptions.json
//      ([{ page, zh, zhTw, reason }]); never add one without Cecil's sign-off.
//   C  lexicon lint — over every zh-TW page (text, attributes, comments, inline
//      script string literals, JSON-LD strings) and every string in
//      src/_data/i18n/zh-tw.json: (1) the deny regexes in scripts/zhtw-lexicon.json
//      must not match — mainland VOCABULARY is the denylist's job; (2) each Han
//      string is an OpenCC (cn → tw) fixed point — this catches Simplified
//      CHARACTER leakage. Exceptions to both: `allow` in the same file
//      ([{ page, text, reason }]; page "*" = any page). A finding is waived when
//      its span lies inside an occurrence of `text`. Additions need Cecil's
//      ratification.
//      Advisory (never fails the run): a cn → twp pass, whose phrase layer forces
//      IT vocabulary onto general text (文件 → 檔案, 查看 → 檢視). Its findings
//      that the blocking checks did not already report, and that no allow entry
//      waives, are printed with counts and context for a human to read.
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
const toTw = OpenCC.Converter({ from: "cn", to: "tw" }); // blocking: character leakage
const toTwp = OpenCC.Converter({ from: "cn", to: "twp" }); // advisory: phrase layer

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
// Also the ONE normalization for Gates A and B: every <time datetime> stamp (the
// attribute value and the element's text) is masked on both sides. The FAQ's
// "Last updated" stamp comes from each file's OWN last commit (gitDateISO), so a
// zh-TW page's date legitimately differs from its zh twin's — the same reason
// scripts/verify.mjs masks it in the EN golden diff.
function strip(node) {
  const kids = node.children || [];
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    if (removable(k)) {
      const prev = kids[i - 1];
      if (prev && prev.type === "text") prev.data = prev.data.replace(/\n[ \t]*$/, "");
      kids.splice(i--, 1);
    } else if (isEl(k) && k.name === "time" && "datetime" in k.attribs) {
      k.attribs.datetime = MASK;
      k.children = [{ type: "text", data: MASK }];
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
// Attributes that carry prose, masked whatever their script.
const TEXT_ATTRS = new Set(["alt", "title", "placeholder", "aria-label", "aria-description"]);
const isTextMeta = (n) =>
  n.name === "meta" &&
  (/^(description|keywords|twitter:.+)$/.test(n.attribs.name || "") ||
    /^(og:title|og:description|og:image:alt)$/.test(n.attribs.property || ""));
const maskProse = (s) => (/\S/.test(s) ? MASK : s);

function skeleton(doc) {
  const out = [];
  let pendingText = null;
  const flush = () => {
    if (pendingText) out.push({ path: pendingText.path, tok: `#text ${JSON.stringify(maskProse(pendingText.raw))}` });
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
      if (n.type === "comment") out.push({ path: p, tok: `#comment ${JSON.stringify(maskProse(n.data))}` });
      else if (n.type === "directive") out.push({ path: p, tok: `#directive ${n.data}` });
      else if (isEl(n)) {
        const np = `${p} > ${label(n)}`;
        const attrs = Object.entries(n.attribs).map(([k, v]) => {
          const ignored =
            (n.name === "html" && k === "lang") ||
            (n.name === "meta" && k === "content" && (n.attribs.property || "") === "og:locale");
          const prose = TEXT_ATTRS.has(k) || (k === "content" && isTextMeta(n));
          return `${k}=${ignored ? "∅" : JSON.stringify(prose ? maskProse(v) : maskHan(toCn(v)))}`;
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

// Returns the BLOCKING findings. waivedCounts (optional): array indexed like
// lexicon.allow, incremented per waived blocking finding (the evidence that an
// entry is still needed). advisory (optional): array that collects the cn → twp
// findings the blocking checks did not already report and no allow entry waives.
function lintStrings(strings, page, lexicon, waivedCounts = [], advisory = []) {
  const deny = lexicon.deny.map((d) => ({ ...d, re: new RegExp(d.pattern, "gu") }));
  const waiver = (s, i, j) =>
    lexicon.allow.findIndex((a) => {
      if (a.page !== page && a.page !== "*") return false;
      for (let k = s.indexOf(a.text); k !== -1; k = s.indexOf(a.text, k + 1)) if (k <= i && j <= k + a.text.length) return true;
      return false;
    });
  const waived = (s, i, j) => {
    const n = waiver(s, i, j);
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
    if (!HAN.test(text)) continue;
    const c = toTw(text);
    const blocking = c === text ? [] : convDiffs(text, c);
    for (const [i, j, repl] of blocking)
      if (!waived(text, i, j))
        findings.push({ kind: "opencc", rule: "cn→tw fixed point", where, span: text.slice(i, j), context: ctx(text, i, j, repl) });
    const p = toTwp(text);
    if (p !== text)
      for (const [i, j, repl] of convDiffs(text, p))
        if (!blocking.some(([a, b]) => a < j && i < b) && waiver(text, i, j) === -1)
          advisory.push({ page, where, span: text.slice(i, j), repl, context: ctx(text, i, j, repl) });
  }
  return findings;
}

const gateC = (doc, page, lexicon, waivedCounts, advisory) => lintStrings(pageStrings(doc), page, lexicon, waivedCounts, advisory);

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

  // A is markup-only: prose may change script freely; links and form values may not.
  {
    const firstIn = (doc, pred) => {
      let hit = null;
      const find = (n) => {
        for (const c of n.children || []) {
          if (hit) return;
          if (pred(c)) hit = c;
          else if (isEl(c) && c.name !== "script" && c.name !== "style") find(c);
        }
      };
      find(doc);
      return hit;
    };
    const d1 = parse(twHtml);
    firstIn(d1, (c) => c.type === "text" && HAN.test(c.data) && c.parent?.name !== "title").data = "Latin text";
    expect("A passes when a Han text node becomes Latin text", gateA(parse(zhHtml), d1).ok);
    const d2 = parse(twHtml);
    const a = firstIn(d2, (c) => isEl(c) && c.name === "a" && c.attribs.href && !c.attribs.href.startsWith("#"));
    a.attribs.href += "-selftest";
    expect(`A fails on a changed href (${a.attribs.href})`, !gateA(parse(zhHtml), d2).ok);
    const d3 = parse(twHtml);
    const o = firstIn(d3, (c) => isEl(c) && c.name === "option" && c.attribs.value);
    o.attribs.value += " (selftest)";
    expect(`A fails on a changed option value (${o.attribs.value})`, !gateA(parse(zhHtml), d3).ok);
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

  // <time> stamp — differing only inside <time datetime> passes A and B; a digit
  // changed OUTSIDE <time> still fails B.
  {
    const stamp = (iso, text) => `<p><time datetime="${iso}">${text}</time> 2</p></main>`;
    const zhT = zhHtml.replace("</main>", stamp("2026-07-01", "最后更新 2026年7月1日"));
    const twT = twHtml.replace("</main>", stamp("2026-10-29", "最後更新 2026年10月29日"));
    expect("A passes when only the <time> stamp differs", gateA(parse(zhT), parse(twT)).ok);
    expect("B passes when only the <time> stamp differs", gateB(parse(zhT), parse(twT), `zh-tw/${rel}`, []).ok);
    const twT2 = twHtml.replace("</main>", stamp("2026-10-29", "最後更新 2026年10月29日").replace(" 2</p>", " 3</p>"));
    expect("B still fails on a digit changed outside <time>", !gateB(parse(zhT), parse(twT2), `zh-tw/${rel}`, []).ok);
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
    hit.data += "仿真软件，联络，舞台，頭部企業，頭部前方，聯絡窗口";
    const adv = [];
    const f = gateC(doc, `zh-tw/${rel}`, lexicon, [], adv);
    expect("C flags injected 仿真 (denylist)", f.some((x) => x.kind === "deny" && x.span === "仿真"));
    // Simplified leakage is the blocking converter's job.
    expect("C flags Simplified 软件 (cn→tw fixed point)", f.some((x) => x.kind === "opencc" && x.span.includes("软")));
    expect("C flags Simplified 联络 (cn→tw fixed point)", f.some((x) => x.kind === "opencc" && x.span.includes("联")));
    // Allow entries are word-scoped: the 平台 waiver must not cover 台 in another word.
    expect("C still flags 台 in 舞台 (allowlist is word-scoped)", f.some((x) => x.kind === "opencc" && x.context.includes("舞[台")));
    // 頭部 is denied only in business-jargon compounds (Part B), not as the anatomical word.
    expect("C flags 頭部企業 (denylist, jargon compound)", f.some((x) => x.kind === "deny" && x.span === "頭部企業"));
    expect("C passes 頭部前方 (anatomical)", !f.some((x) => x.kind === "deny" && x.context.includes("頭部]前方")) && !f.some((x) => x.span === "頭部"));
    // The twp phrase layer is advisory: 聯絡窗口 passes the blocking check but is reported.
    expect("C passes 聯絡窗口 on the blocking check", !f.some((x) => [..."聯絡窗口"].some((ch) => x.span.includes(ch))));
    expect("C lists 窗口 → 視窗 in the advisory output", adv.some((x) => x.span === "窗口" && x.repl === "視窗"));
    // Denylist precision: these deny entries are scoped to their mainland/jargon
    // compounds, so the general-Taiwanese uses pass while the compounds still fail.
    const lint1 = (text) => lintStrings([{ where: "self-test", text }], `zh-tw/${rel}`, lexicon);
    const okWords = ["保持聯繫", "自主導航", "生態系", "推理能力", "錯誤代碼", "機器人質量"];
    const badWords = ["聯繫我們", "主導航", "生態圈", "推理速度", "源代碼", "高質量"];
    const passed = okWords.filter((w) => lint1(w).length === 0);
    expect(`C passes ${okWords.join(" ")} (${passed.length}/${okWords.length})`, passed.length === okWords.length);
    const failed = badWords.filter((w) => lint1(w).some((x) => x.kind === "deny"));
    expect(`C denies ${badWords.join(" ")} (${failed.length}/${badWords.length})`, failed.length === badWords.length);
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
  const advisory = [];
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
    const c = gateC(parse(twHtml), page, lexicon, waivedCounts, advisory);
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
  const cj = lintStrings(jsonFileStrings(twJson), TW_JSON, lexicon, waivedCounts, advisory);
  console.log(row([TW_JSON, "—", "—", cj.length ? RED(`FAIL (${cj.length})`) : GREEN("PASS")]));
  for (const f of cj) fails.push(`${TW_JSON} — Gate C ${f.kind} [${f.rule}] ${f.where}\n          ${f.context}`);
  if (cj.length) allOk = false;

  // Every allow entry and how many Gate C findings it waived across the run, so a
  // ratified exception that silently grows (or goes dead) is visible in the log.
  const totalWaived = waivedCounts.reduce((s, x) => s + (x || 0), 0);
  console.log(`\n  Gate C allowlist — ${totalWaived} finding(s) waived:`);
  lexicon.allow.forEach((a, i) => console.log(`    ${String(waivedCounts[i] || 0).padStart(4)} × page ${a.page}  text ${a.text}`));

  // Advisory: printed for a human, never counted against the run.
  const groups = new Map();
  for (const x of advisory) {
    const key = `${x.span} → ${x.repl}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(x);
  }
  console.log(`\n  Gate C advisory (non-blocking, cn → twp) — ${advisory.length} finding(s), ${groups.size} distinct:`);
  for (const [key, xs] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`    ${String(xs.length).padStart(4)} × ${key}   [${[...new Set(xs.map((x) => x.page))].join(", ")}]`);
    for (const ctxt of [...new Set(xs.map((x) => x.context))].slice(0, 3)) console.log(`           ${ctxt}`);
  }

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
