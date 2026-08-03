# الفصل الخامس — أقسام منفصلة (حسب ترتيب دليل الأطروحة)

## ترتيب الأقسام

| # | القسم | ملف الكتابة (PDF) | صورة المخطط |
|---|--------|-------------------|-------------|
| 1 | 5-1-1 System Block Diagram | `01-5-1-1-system-block-diagram.pdf` | `diagrams/01-system-block-diagram.png` |
| 2 | 5-1-2 Architecture Pattern | `02-5-1-2-architecture-pattern.pdf` | `diagrams/02-architecture-layers.png` |
| 3 | 5-1-3 System Architecture Design | `03-5-1-3-system-architecture-design.pdf` | — |
| 4 | 5-2-1 ER Diagram | `04-5-2-1-er-diagram.pdf` | `diagrams/03-erd-overview.png` |
| 5 | 5-2-2 Relational Schema | `05-5-2-2-relational-schema.pdf` | — |
| 6 | 5-2-3 Constraints and Keys | `06-5-2-3-constraints-and-keys.pdf` | — |
| 7 | 5-3 External APIs Design | `07-5-3-external-apis-design.pdf` | — |
| 8 | 5-4 Security and Permissions Design | `08-5-4-security-and-permissions-design.pdf` | — |

## المجلدات

- `sections/` → ملفات الكتابة PDF منفصلة ومرتبة
- `diagrams/` → المخططات كصور PNG

## إعادة التوليد

```bash
python docs/scripts/generate_chapter05_diagrams.py
python docs/scripts/generate_chapter05_sections_pdf.py
```
