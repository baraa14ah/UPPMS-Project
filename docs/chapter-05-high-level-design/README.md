# الفصل الخامس — التصميم عالي المستوى (UPPMS)

مرتّب حسب دليل الأطروحة، مع فصل الكتابة عن المخططات.

## 1) الكتابة (PDF منفصل لكل قسم)

المجلد: [`sections/`](sections/)

| الترتيب | القسم | الملف |
|---------|--------|--------|
| 1 | 5-1-1 System Block Diagram | `sections/01-5-1-1-system-block-diagram.pdf` |
| 2 | 5-1-2 Architecture Pattern | `sections/02-5-1-2-architecture-pattern.pdf` |
| 3 | 5-1-3 System Architecture Design | `sections/03-5-1-3-system-architecture-design.pdf` |
| 4 | 5-2-1 ER Diagram | `sections/04-5-2-1-er-diagram.pdf` |
| 5 | 5-2-2 Relational Schema | `sections/05-5-2-2-relational-schema.pdf` |
| 6 | 5-2-3 Constraints and Keys | `sections/06-5-2-3-constraints-and-keys.pdf` |
| 7 | 5-3 External APIs Design | `sections/07-5-3-external-apis-design.pdf` |
| 8 | 5-4 Security and Permissions | `sections/08-5-4-security-and-permissions-design.pdf` |

## 2) المخططات (صور)

المجلد: [`diagrams/`](diagrams/)

| القسم | الصورة |
|--------|--------|
| 5-1-1 | `diagrams/01-system-block-diagram.png` |
| 5-1-2 | `diagrams/02-architecture-layers.png` |
| 5-2-1 | `diagrams/03-erd-overview.png` |

## إعادة التوليد

```bash
python docs/scripts/generate_chapter05_diagrams.py
python docs/scripts/generate_chapter05_sections_pdf.py
```
