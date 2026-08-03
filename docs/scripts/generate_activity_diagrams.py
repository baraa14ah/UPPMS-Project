#!/usr/bin/env python3
"""Generate simplified UPPMS activity diagrams (main journeys only)."""
from __future__ import annotations

from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / "activity-diagrams"

# Keep each diagram short: ~5–8 boxes, one main flow.
DIAGRAMS: dict[str, str] = {
    "00-overview": r"""
flowchart TD
  Start([Start]) --> Auth[Register and login]
  Auth --> Approve[Account approved]
  Approve --> Work[Work inside university workspace]
  Work --> Prop[Submit proposal and create project]
  Prop --> Progress[Advance on academic track]
  Progress --> Schedule[Schedule and run defense]
  Schedule --> End([End])

  style Start fill:#E8F5E9,stroke:#2E7D32
  style End fill:#E8F5E9,stroke:#2E7D32
""",
    "01-register-approve": r"""
flowchart TD
  Start([Start]) --> Register[Student or supervisor registers]
  Register --> Check{Found in authorized XML?}
  Check -->|Yes| Active[Account activated]
  Check -->|No| Pending[Pending admin approval]
  Pending --> Admin[Admin approves user]
  Admin --> Active
  Active --> Login[Login to UPPMS]
  Login --> End([End])

  style Start fill:#E8F5E9,stroke:#2E7D32
  style End fill:#E8F5E9,stroke:#2E7D32
  style Check fill:#FFF8E1,stroke:#F9A825
""",
    "02-proposal-to-project": r"""
flowchart TD
  Start([Start]) --> AI{Use AI for project idea?}
  AI -->|Yes| Suggest[AI suggests project ideas]
  Suggest --> Prefill[Adopt idea into proposal]
  AI -->|No| Manual[Write proposal manually]
  Prefill --> Submit[Submit proposal to supervisor]
  Manual --> Submit
  Submit --> Decision{Supervisor decision?}
  Decision -->|Reject| Fix[Student revises or stops]
  Decision -->|Approve| Create[System creates project]
  Fix --> End1([End])
  Create --> End2([End])

  style Start fill:#E8F5E9,stroke:#2E7D32
  style End1 fill:#FFEBEE,stroke:#C62828
  style End2 fill:#E8F5E9,stroke:#2E7D32
  style AI fill:#FFF8E1,stroke:#F9A825
  style Decision fill:#FFF8E1,stroke:#F9A825
""",
    "03-project-work": r"""
flowchart TD
  Start([Start]) --> Open[Open existing project]
  Open --> Tasks[Manage tasks and comments]
  Tasks --> Invite[Invite team members]
  Invite --> Breakdown[Optional AI task breakdown]
  Breakdown --> Ready[Project ready for defense stage]
  Ready --> End([End])

  style Start fill:#E8F5E9,stroke:#2E7D32
  style End fill:#E8F5E9,stroke:#2E7D32
""",
    "04-academic-progress": r"""
flowchart TD
  Start([Start]) --> Track[Student assigned to academic track]
  Track --> Current[Work on current stage project]
  Current --> Defense[Attend defense]
  Defense --> Result{Pass?}
  Result -->|No| Retry[Stay or retry according to rules]
  Result -->|Yes| Next[Move to next stage or phase]
  Next --> More{Track finished?}
  More -->|No| Current
  More -->|Yes| Done[Graduation / track complete]
  Retry --> End1([End])
  Done --> End2([End])

  style Start fill:#E8F5E9,stroke:#2E7D32
  style End1 fill:#FFEBEE,stroke:#C62828
  style End2 fill:#E8F5E9,stroke:#2E7D32
  style Result fill:#FFF8E1,stroke:#F9A825
  style More fill:#FFF8E1,stroke:#F9A825
""",
    "05-scheduling-defense": r"""
flowchart TD
  Start([Start]) --> Setup[Admin sets rooms dates and availability]
  Setup --> Mode{Assignment mode?}
  Mode -->|Genetic schedule| Generate[Generate schedule with GA]
  Mode -->|Individual| Manual[Assign supervisors one by one]
  Generate --> Review[Review and confirm sessions]
  Manual --> Review
  Review --> Committees[Assign defense committees]
  Committees --> Result[Record defense result]
  Result --> End([End])

  style Start fill:#E8F5E9,stroke:#2E7D32
  style End fill:#E8F5E9,stroke:#2E7D32
  style Mode fill:#FFF8E1,stroke:#F9A825
""",
    "06-xml-import": r"""
flowchart TD
  Start([Start]) --> Upload[Admin uploads authorized users XML]
  Upload --> Preview[System shows comparison preview]
  Preview --> Confirm{Confirm import?}
  Confirm -->|No| Cancel[Cancel]
  Confirm -->|Yes| Apply[Apply new updated and removed users]
  Apply --> End([End])
  Cancel --> End

  style Start fill:#E8F5E9,stroke:#2E7D32
  style End fill:#E8F5E9,stroke:#2E7D32
  style Confirm fill:#FFF8E1,stroke:#F9A825
""",
}

TITLES = {
    "00-overview": "UPPMS — Overall System Flow",
    "01-register-approve": "UPPMS — Register and Approve Account",
    "02-proposal-to-project": "UPPMS — AI Idea / Proposal to Project",
    "03-project-work": "UPPMS — Project Collaboration",
    "04-academic-progress": "UPPMS — Academic Track Progress",
    "05-scheduling-defense": "UPPMS — Scheduling, Committees and Defense",
    "06-xml-import": "UPPMS — XML Import",
}

TEMPLATE = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <style>
    body {{ margin: 0; padding: 32px; background: #ffffff; }}
    .wrap {{ display: inline-block; background: #fff; }}
    .title {{
      font-family: Segoe UI, Arial, sans-serif;
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 16px 0;
    }}
    .mermaid {{ background: #fff; }}
  </style>
</head>
<body>
  <div class="wrap">
    <p class="title">{title}</p>
    <pre class="mermaid">
{src}
    </pre>
  </div>
<script>
  mermaid.initialize({{
    startOnLoad: true,
    theme: "base",
    securityLevel: "loose",
    themeVariables: {{
      primaryColor: "#E3F2FD",
      primaryBorderColor: "#1565C0",
      primaryTextColor: "#0F172A",
      lineColor: "#475569",
      secondaryColor: "#FFF8E1",
      tertiaryColor: "#F8FAFC",
      fontFamily: "Segoe UI, Arial, sans-serif",
      fontSize: "16px"
    }},
    flowchart: {{ useMaxWidth: false, htmlLabels: true, curve: "basis" }}
  }});
</script>
</body>
</html>
"""

README = """# UPPMS Activity Diagrams

مخططات نشاط مبسطة لأهم رحلات النظام (فلو مجمل، بدون تفاصيل داخلية كثيرة).

## Images

| File | الوحدة |
|------|--------|
| `00-overview.png` | نظرة عامة على النظام |
| `01-register-approve.png` | التسجيل واعتماد الحساب |
| `02-proposal-to-project.png` | فكرة AI / مقترح → مشروع |
| `03-project-work.png` | العمل على المشروع وتقسيم المهام |
| `04-academic-progress.png` | التقدم في المسار الأكاديمي |
| `05-scheduling-defense.png` | جدولة / تعيين فردي / لجان / مناقشة |
| `06-xml-import.png` | استيراد XML |

## Regenerate

```bash
python docs/scripts/generate_activity_diagrams.py
```
"""


def clear_old_outputs() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    for path in ROOT.iterdir():
        if path.suffix.lower() in {".mmd", ".png", ".html", ".md"}:
            path.unlink(missing_ok=True)


def write_sources() -> list[str]:
    names: list[str] = []
    for name, src in DIAGRAMS.items():
        path = ROOT / f"{name}.mmd"
        path.write_text(src.strip() + "\n", encoding="utf-8")
        names.append(name)
        print(f"Wrote {path.name}")
    (ROOT / "README.md").write_text(README, encoding="utf-8")
    return names


def render(names: list[str]) -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1400, "height": 1200})
        for name in names:
            src = (ROOT / f"{name}.mmd").read_text(encoding="utf-8")
            html_path = ROOT / f"{name}.tmp.html"
            html_path.write_text(
                TEMPLATE.format(src=src, title=TITLES[name]),
                encoding="utf-8",
            )
            page.goto(html_path.resolve().as_uri(), wait_until="networkidle")
            page.wait_for_timeout(1400)
            if page.locator("text=Syntax error").count():
                raise RuntimeError(f"Mermaid syntax error in {name}")
            wrap = page.locator(".wrap")
            wrap.wait_for(timeout=20000)
            page.locator(".mermaid svg").wait_for(timeout=20000)
            box = wrap.bounding_box()
            if box:
                page.set_viewport_size(
                    {
                        "width": max(1000, int(box["width"]) + 80),
                        "height": max(700, int(box["height"]) + 80),
                    }
                )
                page.wait_for_timeout(250)
            out = ROOT / f"{name}.png"
            wrap.screenshot(path=str(out))
            html_path.unlink(missing_ok=True)
            print(f"OK {out.name} ({out.stat().st_size} bytes)")
        browser.close()


def main() -> None:
    clear_old_outputs()
    names = write_sources()
    render(names)
    print(f"Done — {len(names)} simplified diagrams in {ROOT}")


if __name__ == "__main__":
    main()
