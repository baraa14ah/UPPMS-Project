#!/usr/bin/env python3
"""Generate Chapter 5 diagrams: system block + ER overview."""
from __future__ import annotations

from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / "chapter-05-high-level-design" / "diagrams"

DIAGRAMS = {
    "01-system-block-diagram": r"""
flowchart LR
  subgraph Clients["Clients"]
    Browser["Web Browser<br/>React SPA"]
  end

  subgraph UPPMS["UPPMS System"]
    FE["Frontend Layer<br/>React + MUI + Router"]
    API["API Layer<br/>Laravel Controllers"]
    SVC["Business Layer<br/>Services + Scheduling GA"]
    DATA["Data Layer<br/>Eloquent Models"]
  end

  subgraph External["External Services"]
    MySQL[(MySQL Database)]
    Gemini["Google Gemini API"]
    GitHub["GitHub OAuth + API"]
  end

  Browser --> FE
  FE -->|REST JSON + Bearer Token| API
  API --> SVC
  SVC --> DATA
  DATA --> MySQL
  SVC --> Gemini
  SVC --> GitHub
  API --> GitHub

  style FE fill:#E3F2FD,stroke:#1565C0
  style API fill:#E8F5E9,stroke:#2E7D32
  style SVC fill:#FFF8E1,stroke:#F9A825
  style DATA fill:#F3E5F5,stroke:#7B1FA2
  style MySQL fill:#ECEFF1,stroke:#546E7A
""",
    "02-architecture-layers": r"""
flowchart TB
  subgraph Pattern["Architecture Pattern used in UPPMS"]
    direction TB
    subgraph P1["1. Client-Server + SPA"]
      Client["Client Tier<br/>React Single Page Application"]
      Server["Server Tier<br/>Laravel REST API"]
      Client -->|HTTPS JSON| Server
    end

    subgraph P2["2. Layered Architecture on Server"]
      direction TB
      L1["Presentation / API Layer<br/>Routes + Controllers"]
      L2["Business Layer<br/>Services + Genetic Scheduler"]
      L3["Data Access Layer<br/>Eloquent Models + TenantScope"]
      L4[("Database Layer<br/>MySQL")]
      L1 --> L2 --> L3 --> L4
    end

    subgraph P3["3. Multi-Tenant SaaS"]
      T["Shared database<br/>Logical isolation by university_id"]
    end

    Server --> L1
    L3 --> T
  end

  style Client fill:#E3F2FD,stroke:#1565C0
  style Server fill:#E8F5E9,stroke:#2E7D32
  style L1 fill:#E3F2FD,stroke:#1565C0
  style L2 fill:#FFF8E1,stroke:#F9A825
  style L3 fill:#F3E5F5,stroke:#7B1FA2
  style L4 fill:#CFD8DC,stroke:#455A64
  style T fill:#FFECB3,stroke:#FF8F00
""",
    "03-erd-overview": r"""
erDiagram
  UNIVERSITIES ||--o{ USERS : has
  ROLES ||--o{ USERS : assigns
  UNIVERSITIES ||--o{ PROJECTS : owns
  UNIVERSITIES ||--o{ TRACKS : owns
  USERS ||--o{ PROJECTS : owns
  USERS ||--o{ PROJECT_PROPOSALS : submits
  PROJECT_PROPOSALS ||--o| PROJECTS : creates
  PROJECTS ||--o{ TASKS : contains
  PROJECTS ||--o{ COMMENTS : has
  PROJECTS ||--o{ DEFENSE_SESSIONS : scheduled_as
  TRACKS ||--o{ TRACK_STAGES : contains
  TRACKS ||--o{ STUDENT_PROGRESS : tracks
  USERS ||--o{ STUDENT_PROGRESS : progresses
  ACADEMIC_STAGES_CONFIG ||--o{ APPROVED_SCHEDULES : for_stage
  APPROVED_SCHEDULES ||--o{ DEFENSE_SESSIONS : materializes
  COMMITTEES ||--o{ DEFENSE_SESSIONS : examines
  UNIVERSITIES ||--o{ XML_AUTHORIZED_USERS : authorizes
  UNIVERSITIES ||--o{ AVAILABLE_ROOMS : provides
  USERS ||--o{ DOCTOR_AVAILABILITIES : submits

  UNIVERSITIES {
    int id PK
    string name
    string code
  }
  USERS {
    int id PK
    int university_id FK
    int role_id FK
    string email
    string status
  }
  PROJECTS {
    int id PK
    int university_id FK
    int owner_id FK
    int proposal_id FK
    string title
    string status
  }
  PROJECT_PROPOSALS {
    int id PK
    int student_id FK
    int supervisor_id FK
    string status
  }
  TRACKS {
    int id PK
    int university_id FK
    string name
  }
  TRACK_STAGES {
    int id PK
    int track_id FK
    int parent_id FK
    string stage_kind
  }
  STUDENT_PROGRESS {
    int id PK
    int student_id FK
    int track_stage_id FK
    string status
  }
  APPROVED_SCHEDULES {
    int id PK
    int university_id FK
    int academic_stage_id FK
    string status
  }
  DEFENSE_SESSIONS {
    int id PK
    int project_id FK
    int committee_id FK
    datetime scheduled_at
    string status
  }
  COMMITTEES {
    int id PK
    int university_id FK
    string name
  }
  XML_AUTHORIZED_USERS {
    int id PK
    int university_id FK
    string university_number
    string user_type
  }
""",
}

TITLES = {
    "01-system-block-diagram": "UPPMS — System Block Diagram (5-1-1)",
    "02-architecture-layers": "UPPMS — Architecture Pattern Used (5-1-2)",
    "03-erd-overview": "UPPMS — ER Diagram Overview (5-2-1)",
}

TEMPLATE = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <style>
    body {{ margin: 0; padding: 28px; background: #fff; }}
    .wrap {{ display: inline-block; background: #fff; }}
    .title {{ font-family: Segoe UI, Arial, sans-serif; font-size: 18px; font-weight: 700; margin: 0 0 14px; color: #1e293b; }}
  </style>
</head>
<body>
  <div class="wrap">
    <p class="title">{title}</p>
    <pre class="mermaid">{src}</pre>
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
      fontFamily: "Segoe UI, Arial, sans-serif",
      fontSize: "14px"
    }},
    flowchart: {{ useMaxWidth: false, htmlLabels: true, curve: "basis" }},
    er: {{ useMaxWidth: false }}
  }});
</script>
</body>
</html>
"""


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1600, "height": 1200})
        for name, src in DIAGRAMS.items():
            mmd = ROOT / f"{name}.mmd"
            mmd.write_text(src.strip() + "\n", encoding="utf-8")
            html = ROOT / f"{name}.tmp.html"
            html.write_text(TEMPLATE.format(src=src.strip(), title=TITLES[name]), encoding="utf-8")
            page.goto(html.resolve().as_uri(), wait_until="networkidle")
            page.wait_for_timeout(1800)
            if page.locator("text=Syntax error").count():
                raise RuntimeError(f"Syntax error in {name}")
            wrap = page.locator(".wrap")
            wrap.wait_for()
            page.locator(".mermaid svg").wait_for(timeout=20000)
            box = wrap.bounding_box()
            if box:
                page.set_viewport_size(
                    {
                        "width": max(1100, int(box["width"]) + 90),
                        "height": max(800, int(box["height"]) + 90),
                    }
                )
                page.wait_for_timeout(300)
            out = ROOT / f"{name}.png"
            wrap.screenshot(path=str(out))
            html.unlink(missing_ok=True)
            print(f"OK {out.name} ({out.stat().st_size})")
        browser.close()


if __name__ == "__main__":
    main()
