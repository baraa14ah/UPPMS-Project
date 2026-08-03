#!/usr/bin/env python3
"""Generate Chapter 7 diagrams (test plan, pyramid, results)."""
from __future__ import annotations

from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / "chapter-07-testing-and-evaluation" / "diagrams"
ROOT.mkdir(parents=True, exist_ok=True)

DIAGRAMS = {
    "01-test-plan-flow": r"""
flowchart TD
  A["تحديد نطاق الاختبار<br/>Scope Definition"] --> B["إعداد بيئة الاختبار<br/>PHPUnit + MySQL Test DB"]
  B --> C["كتابة حالات الاختبار<br/>Unit / Feature"]
  C --> D["تنفيذ الاختبارات الآلية<br/>php artisan test / phpunit"]
  D --> E{"النتائج؟"}
  E -->|نجاح| F["توثيق المقاييس والجودة"]
  E -->|فشل| G["إصلاح الخلل + Regression"]
  G --> D
  F --> H["اختبار القبول مع مستخدمين<br/>Demo SPU Campus"]
  H --> I["تحليل التغذية الراجعة<br/>وتحسينات مقترحة"]

  style A fill:#E3F2FD,stroke:#1565C0
  style D fill:#E8F5E9,stroke:#2E7D32
  style E fill:#FFF8E1,stroke:#F9A825
  style G fill:#FFEBEE,stroke:#C62828
  style I fill:#E0F2F1,stroke:#00695C
""",
    "02-test-pyramid": r"""
flowchart TB
  subgraph Pyramid["هرم اختبارات UPPMS"]
    Acc["Acceptance / User Testing<br/>سيناريوهات الحرم التجريبي SPU"]
    Sys["System / Feature Tests<br/>Controllers + API + Multi-tenancy"]
    Int["Integration<br/>Services + DB + XML + Scheduling"]
    Unit["Unit Tests<br/>Fitness / GA Operators / TrackService / XmlImport"]
  end

  Acc --- Sys
  Sys --- Int
  Int --- Unit

  style Unit fill:#C8E6C9,stroke:#2E7D32
  style Int fill:#BBDEFB,stroke:#1565C0
  style Sys fill:#FFE0B2,stroke:#EF6C00
  style Acc fill:#E1BEE7,stroke:#6A1B9A
""",
    "03-test-coverage-modules": r"""
flowchart LR
  subgraph Modules["وحدات مغطاة بالاختبارات"]
    A["XML Registration"]
    B["Proposals"]
    C["Tracks / Progress"]
    D["Committees"]
    E["Genetic Scheduling"]
    F["AI Services"]
    G["Invitations"]
  end

  T["PHPUnit Suite<br/>~141 test cases"] --> A
  T --> B
  T --> C
  T --> D
  T --> E
  T --> F
  T --> G

  style T fill:#0D7A6F,color:#fff,stroke:#065F56
""",
    "04-results-summary": r"""
%%{init: {'themeVariables': { 'pie1': '#2E7D32', 'pie2': '#1565C0'}}}%%
pie showData
    title توزيع حالات الاختبار الآلية (141)
    "Unit Tests" : 50
    "Feature / System Tests" : 91
""",
}


HTML_TMPL = """<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<style>
  body {{ margin: 0; background: #fff; display:flex; align-items:center; justify-content:center; min-height:100vh; }}
  .wrap {{ padding: 24px; }}
  .mermaid {{ background: #fff; }}
</style>
</head><body><div class="wrap"><div class="mermaid">{code}</div></div>
<script>mermaid.initialize({{ startOnLoad: true, theme: "neutral", securityLevel: "loose" }});</script>
</body></html>
"""


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1400, "height": 900})
        for name, code in DIAGRAMS.items():
            html_path = ROOT / f"{name}.html"
            html_path.write_text(HTML_TMPL.format(code=code), encoding="utf-8")
            page.goto(html_path.as_uri())
            page.wait_for_timeout(1200)
            page.locator(".mermaid svg").screenshot(path=str(ROOT / f"{name}.png"))
            print(f"OK {name}.png")
        browser.close()


if __name__ == "__main__":
    main()
