# Colour-profile and EXIF-orientation audit for the image set.
#
# Walks src/img and reports, for every raster image, which ICC profile it carries and
# whether that profile is WIDE-GAMUT. This exists because of a real defect: in PR #100
# jeff-ichnowski.jpg was re-encoded by dropping its Display P3 profile without
# converting the pixels, leaving P3 values to be reinterpreted as sRGB — a visible
# desaturation, corrected before merge. Five headshots still carry Display P3 today
# (see the colour-profile note above the Image guidelines table in README.md).
#
# The rule this enforces by making the trap visible: before stripping an ICC profile,
# check what it is. A plain "sRGB IEC61966-2.1" profile is safe to drop, because an
# absent profile means "assume sRGB" and that is what the pixels already are. A
# wide-gamut profile must be CONVERTED to sRGB, never dropped.
#
# Wide-gamut detection compares the profile's red colorant X against sRGB's 0.4360;
# Display P3 sits at 0.5151. Anything more than 0.01 away is flagged.
#
# EXIF orientation is reported too: a value other than 1 makes browsers rotate the
# image on render, so a file that looks correct in an editor can ship sideways.
#
# MANUAL TOOL — this deliberately does NOT gate CI and is not in package.json.
# Run it after adding or re-encoding photos.
#
#   Usage:  python scripts/icc-audit.py             (audits ./src/img)
#           python scripts/icc-audit.py <dir>       (audits another tree)
#
#   Requires: Pillow  (pip install Pillow) — the only tool here with a dependency,
#   which is why it is not wired into npm scripts or a workflow.
#   Exit code: always 0. This reports; it does not judge. A wide-gamut profile is
#   not a defect — dropping one without converting is, and only a human editing the
#   file can commit that.
#
# WHAT THIS DOES NOT COVER:
#   - It does not convert anything. It tells you which files need care, not how the
#     conversion went. Verify a re-encode by measuring PSNR against the ORIGINAL
#     colour-managed through its own profile, not against a plain resize — measuring
#     against a plain resize silently assumes the profile away, which is exactly how
#     the PR #100 error passed its first quality check.
#   - It reasons about src/ inputs, not the built site. Profiles survive to
#     production untouched: src/img is passthrough-copied byte-verbatim with no
#     image-processing plugin, so what this reports is what ships.
#   - It says nothing about dimensions, weight, or whether a photo is square. The
#     600x600 square standard is documented in README's Image guidelines table.

import glob
import io
import os
import sys

# A profile description can contain non-ASCII; a default Windows console (cp1252)
# would raise UnicodeEncodeError while printing it. Force UTF-8 out.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    from PIL import Image, ImageCms
except ImportError:
    print("  Pillow is required:  pip install Pillow")
    sys.exit(0)

SRGB_RED_X = 0.4360  # sRGB red colorant X (rXYZ); Display P3 is 0.5151
RASTER = (".jpg", ".jpeg", ".png", ".webp")


def describe(icc):
    """Return (profile description, red-colorant X or None) for raw ICC bytes."""
    profile = ImageCms.ImageCmsProfile(io.BytesIO(icc))
    desc = ImageCms.getProfileDescription(profile).strip()
    try:
        return desc, profile.profile.red_colorant[0][0]
    except Exception:
        return desc, None


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else os.path.join("src", "img")
    files = sorted(
        f for f in glob.glob(os.path.join(root, "**", "*"), recursive=True)
        if os.path.isfile(f) and f.lower().endswith(RASTER)
    )

    wide, rotated, profiled = [], [], 0
    for f in files:
        try:
            im = Image.open(f)
            im.load()
        except Exception as exc:
            print(f"  UNREADABLE  {f}: {exc}")
            continue

        icc = im.info.get("icc_profile")
        if icc:
            profiled += 1
            desc, red_x = describe(icc)
            if red_x is not None and abs(red_x - SRGB_RED_X) > 0.01:
                wide.append((f, desc, red_x, os.path.getsize(f)))

        orientation = im.getexif().get(274)
        if orientation not in (None, 1):
            rotated.append((f, orientation))

    print(f"=== {len(files)} raster images scanned; {profiled} carry an ICC profile ===")

    print("\n--- WIDE-GAMUT profiles (CONVERT to sRGB; never strip) ---")
    for f, desc, red_x, size in sorted(wide, key=lambda r: -r[3]):
        rel = f.replace(os.sep, "/")
        print(f"  {size // 1024:5d} KB  rX={red_x:.4f}  {desc!r:16s}  {rel}")
    if not wide:
        print("  none — every profiled image is sRGB, so stripping a profile is a no-op")

    print("\n--- EXIF orientation != 1 (browsers would rotate these on render) ---")
    for f, orientation in rotated:
        print(f"  orientation={orientation}  {f.replace(os.sep, '/')}")
    if not rotated:
        print("  none")

    return 0


if __name__ == "__main__":
    sys.exit(main())
