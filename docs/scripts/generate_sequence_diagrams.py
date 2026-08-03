#!/usr/bin/env python3
"""Generate balanced UPPMS sequence diagrams: clear explanation, not crowded."""
from __future__ import annotations

from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / "sequence-diagrams"

# Middle ground: real Controller/Service names, clear story, ~8–12 steps.
DIAGRAMS: dict[str, str] = {
    "01-manage-projects": r"""
sequenceDiagram
  autonumber
  actor Student
  participant AIC as AIIdeationController
  participant PPC as ProjectProposalController
  participant Svc as ProjectProposalService
  actor Supervisor

  Note over Student,AIC: Optional - get AI project idea first
  Student->>AIC: request project ideas
  AIC-->>Student: suggested ideas

  Student->>PPC: submit proposal
  PPC->>Svc: createProposal()
  Svc-->>PPC: proposal pending
  PPC-->>Supervisor: notify new proposal

  Supervisor->>PPC: approve or reject
  PPC->>Svc: decide(proposal)
  alt Approved
    Svc-->>PPC: project created
    PPC-->>Student: project is ready
  else Rejected
    Svc-->>PPC: rejected
    PPC-->>Student: rejection reason
  end
""",
    "02-manage-tasks": r"""
sequenceDiagram
  autonumber
  actor Student
  participant TC as TaskController
  participant ATC as AITaskController
  participant Svc as TaskService
  actor Supervisor

  Student->>TC: open project tasks
  TC->>Svc: getProjectTasks()
  Svc-->>TC: task list
  TC-->>Student: show tasks

  Student->>TC: create or update task
  TC->>Svc: saveTask()
  Svc-->>TC: saved
  TC-->>Student: task updated

  Note over Student,ATC: Optional - AI task breakdown
  Student->>ATC: generate tasks from project
  ATC->>Svc: insert generated tasks
  Svc-->>ATC: tasks added
  ATC-->>Student: new tasks ready

  Supervisor->>TC: review team progress
  TC->>Svc: getProjectTasks()
  Svc-->>TC: status
  TC-->>Supervisor: task progress
""",
    "03-onboard-new-member": r"""
sequenceDiagram
  autonumber
  actor Owner as Student (Owner)
  participant Ctrl as StudentInvitationController
  participant Svc as InvitationService
  actor Invitee as Student (Invitee)

  Owner->>Ctrl: invite student to project
  Ctrl->>Svc: invite(member)
  Svc->>Svc: check track eligibility
  alt Eligible
    Svc-->>Ctrl: invitation created
    Ctrl-->>Invitee: send invitation
    Invitee->>Ctrl: accept or decline
    Ctrl->>Svc: respond(invite)
    alt Accepted
      Svc-->>Ctrl: member added
      Ctrl-->>Owner: member joined
      Ctrl-->>Invitee: welcome to project
    else Declined
      Svc-->>Ctrl: declined
      Ctrl-->>Owner: invitation declined
    end
  else Not eligible
    Svc-->>Ctrl: blocked by track rules
    Ctrl-->>Owner: cannot invite
  end
""",
    "04-pursuing-progress": r"""
sequenceDiagram
  autonumber
  actor Supervisor
  participant TrackC as TrackController
  participant TrackS as TrackService
  actor Student
  participant SchedC as ScheduleController

  Supervisor->>TrackC: open student progress
  TrackC->>TrackS: getProgressTimeline()
  TrackS-->>TrackC: stages and status
  TrackC-->>Supervisor: show timeline

  Note over Student,SchedC: After defense session
  Student->>SchedC: defense completed
  SchedC->>TrackS: applyDefenseProgress()
  TrackS->>TrackS: update current stage
  TrackS-->>SchedC: progress saved
  SchedC-->>Supervisor: progress updated
  SchedC-->>Student: next stage or completed
""",
    "05-generate-optimal-schedule": r"""
sequenceDiagram
  autonumber
  actor Admin as University Admin
  participant SC as ScheduleController
  participant GAS as GeneticSchedulerService
  participant SAS as ScheduleApprovalService
  actor Supervisor
  actor Student

  Admin->>SC: prepare rooms, dates, and readiness
  SC-->>Admin: ready to generate

  Admin->>SC: generate schedule
  Note over SC,GAS: Individual mode or Committee mode
  SC->>GAS: run genetic algorithm
  GAS-->>SC: top schedule candidates
  SC-->>Admin: show candidates

  Admin->>SC: approve one schedule
  SC->>SAS: save defense sessions
  SAS-->>SC: schedule activated
  SC-->>Supervisor: notify assigned defense
  SC-->>Student: notify defense scheduled
  SC-->>Admin: done
""",
    "06-manage-platform": r"""
sequenceDiagram
  autonumber
  actor Super as Super Admin
  participant PAC as PlatformAdminController
  participant UC as UniversityController

  Super->>PAC: open platform admin
  PAC-->>Super: dashboard

  Super->>UC: add or update university
  UC-->>Super: university saved

  Super->>PAC: manage university admins
  PAC-->>Super: admins updated

  Super->>PAC: check platform status
  PAC-->>Super: health summary
""",
}

TITLES = {
    "01-manage-projects": "UPPMS — Manage Projects",
    "02-manage-tasks": "UPPMS — Manage Tasks",
    "03-onboard-new-member": "UPPMS — Onboard New Member",
    "04-pursuing-progress": "UPPMS — Pursuing Progress",
    "05-generate-optimal-schedule": "UPPMS — Generate Optimal Schedule",
    "06-manage-platform": "UPPMS — Manage Platform",
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
      actorBkg: "#E8F5E9",
      actorBorder: "#2E7D32",
      actorTextColor: "#0F172A",
      actorLineColor: "#64748B",
      signalColor: "#334155",
      signalTextColor: "#0F172A",
      labelBoxBkgColor: "#FFF8E1",
      labelBoxBorderColor: "#F9A825",
      labelTextColor: "#0F172A",
      noteBkgColor: "#FFFDE7",
      noteTextColor: "#0F172A",
      noteBorderColor: "#F9A825",
      activationBkgColor: "#BBDEFB",
      activationBorderColor: "#1565C0",
      sequenceNumberColor: "#ffffff",
      fontFamily: "Segoe UI, Arial, sans-serif",
      fontSize: "15px"
    }},
    sequence: {{
      useMaxWidth: false,
      actorMargin: 70,
      diagramMarginX: 24,
      diagramMarginY: 16,
      boxMargin: 12,
      messageMargin: 42,
      mirrorActors: false
    }}
  }});
</script>
</body>
</html>
"""

README = """# UPPMS Sequence Diagrams

مخططات تسلسل واضحة لكل Use Case:

- Actor → Controller → Service
- شرح كافٍ للفلو (بدون ازدحام، وبدون تبسيط ناقص)

## Images

| File | Use Case | What it explains |
|------|----------|------------------|
| `01-manage-projects.png` | Manage Projects | AI idea → proposal → approve → project |
| `02-manage-tasks.png` | Manage Tasks | CRUD tasks + optional AI breakdown + supervisor review |
| `03-onboard-new-member.png` | Onboard New Member | Invite → eligibility → accept/decline |
| `04-pursuing-progress.png` | Pursuing Progress | View timeline → defense updates progress |
| `05-generate-optimal-schedule.png` | Generate Optimal Schedule | Prepare → generate (individual/committee) → approve → notify |
| `06-manage-platform.png` | Manage Platform | Universities, admins, platform status |

## Regenerate

```bash
python docs/scripts/generate_sequence_diagrams.py
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
        page = browser.new_page(viewport={"width": 1600, "height": 1200})
        for name in names:
            src = (ROOT / f"{name}.mmd").read_text(encoding="utf-8")
            html_path = ROOT / f"{name}.tmp.html"
            html_path.write_text(
                TEMPLATE.format(src=src, title=TITLES[name]),
                encoding="utf-8",
            )
            page.goto(html_path.resolve().as_uri(), wait_until="networkidle")
            page.wait_for_timeout(1500)
            if page.locator("text=Syntax error").count():
                raise RuntimeError(f"Mermaid syntax error in {name}")
            wrap = page.locator(".wrap")
            wrap.wait_for(timeout=20000)
            page.locator(".mermaid svg").wait_for(timeout=20000)
            box = wrap.bounding_box()
            if box:
                page.set_viewport_size(
                    {
                        "width": max(1100, int(box["width"]) + 90),
                        "height": max(750, int(box["height"]) + 90),
                    }
                )
                page.wait_for_timeout(280)
            out = ROOT / f"{name}.png"
            wrap.screenshot(path=str(out))
            html_path.unlink(missing_ok=True)
            print(f"OK {out.name} ({out.stat().st_size} bytes)")
        browser.close()


def main() -> None:
    clear_old_outputs()
    names = write_sources()
    render(names)
    print(f"Done — {len(names)} balanced sequence diagrams in {ROOT}")


if __name__ == "__main__":
    main()
