#!/usr/bin/env python3
"""Render ADD-*.mmd diagrams to PNG via Playwright + Mermaid CDN."""
from __future__ import annotations

from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / "diagrams" / "ga"
NAMES = [
    "ADD-01-three-additions-overview",
    "ADD-02-penalty-lexicographic",
    "ADD-03-smart-init",
    "ADD-04-repair-operator",
    "ADD-05-pipeline-with-additions",
]

TEMPLATE = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <style>body{margin:0;padding:24px;background:#fff}.mermaid{background:#fff}</style>
</head>
<body>
<pre class="mermaid">
{src}
</pre>
<script>
  mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
</script>
</body>
</html>
"""


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1400, "height": 900})
        for name in NAMES:
            src = (ROOT / f"{name}.mmd").read_text(encoding="utf-8")
            html_path = ROOT / f"{name}.tmp.html"
            html_path.write_text(TEMPLATE.replace("{src}", src), encoding="utf-8")
            page.goto(html_path.resolve().as_uri(), wait_until="networkidle")
            page.wait_for_timeout(1500)
            svg = page.locator(".mermaid svg")
            svg.wait_for(timeout=15000)
            out = ROOT / f"{name}.png"
            svg.screenshot(path=str(out))
            html_path.unlink(missing_ok=True)
            print(f"OK {out.name} ({out.stat().st_size} bytes)")
        browser.close()


if __name__ == "__main__":
    main()
