#!/usr/bin/env python3
"""Render the site at real device sizes.

Headless Chrome driven with --window-size refuses to lay out below about
500px, so every "phone" screenshot it produced was actually a ~500px
layout cropped to phone width. Playwright sets device metrics through the
DevTools Protocol instead, which is the only way to get a genuine 390px
viewport.

Usage:
    python3 tools/shot.py                      # all presets, localhost:8099
    python3 tools/shot.py --url https://moosazafar.com
    python3 tools/shot.py --only phone --path /engineering/
    python3 tools/shot.py --scheme light --settled

--settled disables animations and transitions before capturing, so the
reveal animations don't freeze mid-flight in the image.
"""
import argparse
import os
import sys

from playwright.sync_api import sync_playwright

PRESETS = {
    # name:      (width, height, device_scale, mobile)
    "phone":     (390, 844, 3, True),
    "phone-sm":  (360, 780, 3, True),
    "tablet":    (820, 1180, 2, True),
    "laptop":    (1440, 900, 2, False),
    "desktop":   (1920, 1080, 1, False),
}

SETTLE_CSS = """
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:8099")
    ap.add_argument("--path", default="/")
    ap.add_argument("--out", default=None, help="output directory")
    ap.add_argument("--only", default=None, help="one preset name")
    ap.add_argument("--scheme", default="dark", choices=["dark", "light"])
    ap.add_argument("--settled", action="store_true",
                    help="kill animations so nothing is caught mid-transition")
    ap.add_argument("--full", action="store_true", help="full page, not just the viewport")
    args = ap.parse_args()

    out = args.out or os.path.join(os.path.dirname(__file__), "..", "shots")
    out = os.path.abspath(out)
    os.makedirs(out, exist_ok=True)

    names = [args.only] if args.only else list(PRESETS)
    for n in names:
        if n not in PRESETS:
            print(f"unknown preset: {n}; choose from {', '.join(PRESETS)}")
            return 2

    url = args.url.rstrip("/") + args.path
    written = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name in names:
            w, h, scale, mobile = PRESETS[name]
            ctx = browser.new_context(
                viewport={"width": w, "height": h},
                device_scale_factor=scale,
                is_mobile=mobile,
                has_touch=mobile,
                color_scheme=args.scheme,
            )
            page = ctx.new_page()
            page.goto(url, wait_until="networkidle")
            # Wait for the webfonts and for the preloader to clear, otherwise
            # the capture can land before the stylesheet has taken effect.
            page.wait_for_function(
                "document.fonts && document.fonts.status === 'loaded'", timeout=15000
            )
            page.wait_for_function(
                "!document.documentElement.classList.contains('loading')", timeout=15000
            )
            page.wait_for_timeout(500)
            if args.settled:
                page.add_style_tag(content=SETTLE_CSS)
                page.wait_for_timeout(150)

            # Confirm the viewport really is what we asked for — this is the
            # exact thing the old --window-size approach got wrong.
            actual = page.evaluate("document.documentElement.clientWidth")

            slug = args.path.strip("/").replace("/", "-") or "home"
            fn = os.path.join(out, f"{slug}-{name}-{args.scheme}.png")
            page.screenshot(path=fn, full_page=args.full)
            ctx.close()

            flag = "" if actual == w else f"  !! asked {w}, got {actual}"
            print(f"  {name:9} {w}x{h} @{scale}x  viewport={actual}{flag}  -> {os.path.basename(fn)}")
            written.append(fn)
        browser.close()

    print(f"\n{len(written)} file(s) in {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
