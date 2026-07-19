# UPPMS Use Case Diagrams

**One image per module** — no crowded lines.

## View

Open [`use-case-diagram.html`](use-case-diagram.html) in a browser.

## Images (`use-case-diagrams/`)

| File | Module |
|------|--------|
| `00-overview.png` | System map (all modules) |
| `01-authentication.png` | UC-01..10 |
| `02-user-management.png` | UC-11..18 |
| `03-projects.png` | UC-19..26 |
| `04-tasks-comments.png` | UC-27..32 |
| `05-invitations.png` | UC-33..37 |
| `06-versions-github.png` | UC-38..41 |
| `07-ai-services.png` | UC-42..44 |
| `08-notifications.png` | UC-45..46 |
| `09-scheduling-setup.png` | UC-47..50 |
| `10-genetic-scheduling.png` | UC-51..56 |
| `11-platform-admin.png` | UC-57..60 |
| `12-dashboard.png` | UC-61..62 |

## Regenerate

```bash
python docs/render_plantuml.py
```

This runs `generate_use_case_diagrams.py` then renders all `.puml` files to PNG + SVG.

## Edit

Change module definitions in `generate_use_case_diagrams.py`, or edit individual files in `use-case-diagrams/*.puml`.
