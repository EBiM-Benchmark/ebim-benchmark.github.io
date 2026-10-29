// zh → zh-TW co-change check (PR-only; runs in CI after Verify, outside verify:all).
//
// zh-TW is translated from EN with the zh page as its markup template, so a zh
// edit usually needs a matching zh-TW edit. This check makes skipping it a
// deliberate, recorded decision instead of an accident:
//
//   pairs     src/zh/X.njk ↔ src/zh-tw/X.njk
//             src/_data/i18n/zh.json ↔ src/_data/i18n/zh-tw.json
//   rule      a zh file changed in <baseRef>...HEAD whose zh-TW counterpart
//             EXISTS at HEAD must have that counterpart changed too — unless a
//             commit message in <baseRef>..HEAD carries the trailer line
//                 zh-tw-no-change: <zh path> — <reason>
//   always ok zh-TW-only changes; zh changes whose counterpart does not exist yet.
//
// Usage:  node scripts/check-zhtw-cochange.mjs <baseRef>   (e.g. origin/main)
//         node scripts/check-zhtw-cochange.mjs --self-test (decision logic only, no git)
import { execFileSync } from "node:child_process";

const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;

// zh path → its zh-TW counterpart, or null if the file is not a paired zh file.
export function counterpart(file) {
  if (file === "src/_data/i18n/zh.json") return "src/_data/i18n/zh-tw.json";
  if (file.startsWith("src/zh/") && file.endsWith(".njk")) return "src/zh-tw/" + file.slice("src/zh/".length);
  return null;
}

// `zh-tw-no-change: <zh path> — <reason>` lines → Set of waived zh paths.
// The reason is required; a trailer without one waives nothing.
export function waivers(messages) {
  const out = new Set();
  for (const msg of messages)
    for (const line of msg.split(/\r?\n/)) {
      const m = /^zh-tw-no-change:\s*(\S+)\s+—\s+(\S.*)$/.exec(line.trim());
      if (m) out.add(m[1]);
    }
  return out;
}

// changed: paths in the diff; existsAtHead(path) → bool; messages: commit bodies.
// Returns the zh paths that violate the rule, each with its missing counterpart.
export function decide(changed, existsAtHead, messages) {
  const set = new Set(changed);
  const waived = waivers(messages);
  const violations = [];
  for (const file of changed) {
    const tw = counterpart(file);
    if (!tw || set.has(tw) || !existsAtHead(tw) || waived.has(file)) continue;
    violations.push({ zh: file, zhTw: tw });
  }
  return violations;
}

function selfTest() {
  console.log(BOLD("\nZH-TW CO-CHANGE SELF-TEST — decision logic on synthetic inputs\n"));
  const exists = (p) => ["src/zh-tw/contact.njk", "src/_data/i18n/zh-tw.json"].includes(p);
  const cases = [
    { name: "zh + zh-TW counterpart both changed → pass", changed: ["src/zh/contact.njk", "src/zh-tw/contact.njk"], msgs: [], want: 0 },
    { name: "zh changed, existing counterpart untouched → FAIL", changed: ["src/zh/contact.njk"], msgs: [], want: 1 },
    {
      name: "zh changed, counterpart untouched, trailer present → pass",
      changed: ["src/zh/contact.njk"],
      msgs: ["fix(zh): typo\n\nzh-tw-no-change: src/zh/contact.njk — zh-only typo, zh-TW already correct"],
      want: 0,
    },
    { name: "zh changed, counterpart not drafted yet → pass", changed: ["src/zh/index.njk"], msgs: [], want: 0 },
    { name: "zh-TW-only change → pass", changed: ["src/zh-tw/contact.njk"], msgs: [], want: 0 },
    { name: "zh.json changed, zh-tw.json untouched → FAIL", changed: ["src/_data/i18n/zh.json"], msgs: [], want: 1 },
    {
      name: "trailer naming a different file does not waive → FAIL",
      changed: ["src/zh/contact.njk"],
      msgs: ["x\n\nzh-tw-no-change: src/zh/faq.njk — unrelated"],
      want: 1,
    },
    { name: "trailer without a reason does not waive → FAIL", changed: ["src/zh/contact.njk"], msgs: ["x\n\nzh-tw-no-change: src/zh/contact.njk"], want: 1 },
  ];
  let ok = true;
  for (const c of cases) {
    const got = decide(c.changed, exists, c.msgs).length;
    const pass = got === c.want;
    console.log(`  ${pass ? GREEN("PASS") : RED("FAIL")}  ${c.name}${pass ? "" : `  (got ${got} violation(s))`}`);
    if (!pass) ok = false;
  }
  console.log(ok ? GREEN(BOLD("\n✓ ZH-TW CO-CHANGE SELF-TEST PASSED\n")) : RED(BOLD("\n✗ ZH-TW CO-CHANGE SELF-TEST FAILED\n")));
  return ok;
}

function main(base) {
  const git = (...a) => execFileSync("git", a, { encoding: "utf8" });
  const changed = git("diff", "--name-only", `${base}...HEAD`).split("\n").filter(Boolean);
  const messages = git("log", "--format=%B%x00", `${base}..HEAD`).split("\0");
  const existsAtHead = (p) => {
    try {
      execFileSync("git", ["cat-file", "-e", `HEAD:${p}`], { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  };
  console.log(BOLD(`\nzh → zh-TW co-change check (${base}...HEAD, ${changed.length} changed file(s))\n`));
  const v = decide(changed, existsAtHead, messages);
  for (const x of v) console.log(RED(`  ✗ ${x.zh} changed but ${x.zhTw} did not`));
  if (v.length)
    console.log(
      `\n  Update the zh-TW file(s), or add a trailer to a commit message:\n` +
        `    zh-tw-no-change: <zh path> — <reason>\n`,
    );
  console.log(v.length ? RED(BOLD("✗ ZH-TW CO-CHANGE CHECK FAILED")) : GREEN(BOLD("✓ ZH-TW CO-CHANGE CHECK PASSED")));
  return v.length === 0;
}

const arg = process.argv[2];
if (arg === "--self-test") process.exit(selfTest() ? 0 : 1);
if (!arg) {
  console.log(RED("usage: node scripts/check-zhtw-cochange.mjs <baseRef> | --self-test"));
  process.exit(2);
}
process.exit(main(arg) ? 0 : 1);
