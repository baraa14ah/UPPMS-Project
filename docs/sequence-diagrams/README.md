# UPPMS Sequence Diagrams

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
