# Same-page affiliation consistency audit.
#
# For every built page, compares the affiliation printed in the schedule/agenda row
# against the affiliation on that same person's speaker card — SAME page, SAME locale.
# A mismatch means one of the two was edited and the other was not.
#
# MANUAL TOOL — this deliberately does NOT gate CI and is not in package.json.
# Run it by hand on any PR that adds, removes, or edits a person on the site.
#
#   Usage:  python scripts/affil-consistency.py             (audits ./_site)
#           python scripts/affil-consistency.py <siteDir>   (audits another tree)
#
#   Requires: Python 3 standard library only. No pip install, no package.json entry.
#   Exit code: 0 when every page agrees with itself, 1 when any mismatch is found.
#
# WHAT THIS DOES NOT COVER — do not mistake a green run for correctness:
#
#   1. It cannot detect a wrong-but-CONSISTENT affiliation. In PR #96 the agenda row
#      and the speaker card both read "Agile Robots" for Dr. Hao Shao. They agreed
#      perfectly, and the affiliation was still factually wrong — he heads the vivo
#      Robotics Lab, corrected in PR #98. This checks internal consistency, never
#      truth. A wrong fact about a real person is caught only by a human who knows
#      the person; treat any supplied affiliation as unverified until someone does.
#
#   2. It makes NO cross-page assertion, by design. Per the "zh terminology — the
#      published mirror wins" rule in README.md (cited by title, not line number,
#      because line numbers drift every time the README grows), the /zh/ mirror
#      is deliberately internally mixed: the same university legitimately renders as
#      "University of Hamburg" on /zh/index and 汉堡大学 on /zh/open-day-hamburg, and
#      that mix is documented as intentional and explicitly not a bug to fix in
#      passing. A cross-page sweep would flag real people (Prof. Jianwei Zhang,
#      Prof. Min-Chun Hu) as defects forever, so that half was deleted outright
#      rather than left behind a flag where re-enabling it would silently contradict
#      documented policy.
#
#   3. It only sees pages that carry speaker cards (Open Day and Workshop). Organizer
#      and support-team cards on the index have no second rendering to compare against.
#
#   4. Both sides are keyed BY NAME, and the comparison iterates cards and skips any
#      name with no agenda row (see mismatches_on: `if name in agenda`). So it cannot
#      see a ONE-SIDED person at all — a card with no agenda row, or an agenda row
#      with no card, is silently skipped rather than reported, and the run is green.
#      That is exactly the shape of a half-applied ADD, REMOVE, or RENAME — most of
#      what the MANUAL TOOL note above prescribes this tool for. Verified by
#      deleting one speaker card while leaving its agenda row: "0 mismatch(es)",
#      exit 0, on a visibly broken page. For an add/remove/rename its green is NOT
#      evidence: compare the SET of agenda-row names against the SET of speaker-card
#      names per page and locale and assert set EQUALITY (not equal counts — one
#      added plus one dropped leaves the count unchanged). Affiliations only.
#      When you run that set check, exclude UNFILLED-ROLE placeholders first: the
#      workshop panel host is a speaker-name span reading "To be announced" (待公布
#      on /zh/) with no card by design, so a raw set compare reports it as a
#      one-sided person on workshop.html. Only a placeholder inside a speaker-name
#      span matters: the Open Day pages carry none (Hamburg's "to be announced"
#      sits in talk TITLES, which the name sets never read), so they compare equal.

import glob
import os
import re
import sys

# Affiliations on /zh/ pages are Chinese, and a mismatch prints them. On a default
# Windows console (cp1252) that raises UnicodeEncodeError — so the tool would crash
# exactly when it had a finding to report, printing a traceback instead of the
# mismatch. Force UTF-8 out; no effect where the console already handles it.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AGENDA = r'<span class="speaker-name">(.*?)</span>\s*·\s*([^<\n]+)'
CARD = r'talk-speaker-name">(.*?)</h3>\s*<div class="talk-speaker-affil">(.*?)</div>'


def strip_tags(s):
    return re.sub(r"<[^>]+>", "", s).strip()


def mismatches_on(path):
    """Return [(name, agenda_affil, card_affil)] for one page — same page, same locale."""
    html = open(path, encoding="utf-8").read()
    agenda = {strip_tags(n): strip_tags(a) for n, a in re.findall(AGENDA, html, re.S)}
    cards = {strip_tags(n): strip_tags(a) for n, a in re.findall(CARD, html, re.S)}
    return [
        (name, agenda[name], card_affil)
        for name, card_affil in cards.items()
        if name in agenda and agenda[name] != card_affil
    ]


def main():
    site = sys.argv[1] if len(sys.argv) > 1 else "_site"
    if not os.path.isdir(site):
        print(f"  {site} does not exist — run: npx @11ty/eleventy")
        return 1

    pages = sorted(glob.glob(os.path.join(site, "**", "*.html"), recursive=True))
    checked = 0
    found = 0

    for page in pages:
        html = open(page, encoding="utf-8").read()
        if 'class="talk-speaker-affil"' not in html:
            continue
        checked += 1
        pretty = os.path.relpath(page, site).replace(os.sep, "/")
        for name, agenda_affil, card_affil in mismatches_on(page):
            found += 1
            print(f"  MISMATCH  {pretty}  {name}")
            print(f"      agenda row  : {agenda_affil}")
            print(f"      speaker card: {card_affil}")

    print(f"=== {checked} page(s) with speaker cards checked; {found} mismatch(es) ===")
    if not found:
        print("  every speaker's agenda row agrees with their card, per page and locale")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
