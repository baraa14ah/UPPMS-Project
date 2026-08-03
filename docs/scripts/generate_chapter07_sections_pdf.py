#!/usr/bin/env python3
"""Generate Chapter 7 (Testing & Evaluation) HTML sections + PDFs — SPU thesis guide."""
from __future__ import annotations

from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / "chapter-07-testing-and-evaluation"
OUT = ROOT / "sections"
DIAG = ROOT / "diagrams"
OUT.mkdir(parents=True, exist_ok=True)
DIAG.mkdir(parents=True, exist_ok=True)

STYLE = """
  @page { size: A4; margin: 20mm 16mm 18mm 16mm; }
  body {
    font-family: "Traditional Arabic", "Times New Roman", Times, serif;
    font-size: 13.5pt; line-height: 1.85; color: #111; margin: 0; background: #fff;
    text-align: justify; direction: rtl;
  }
  .head {
    border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 22px;
  }
  .head .chapter { font-size: 12pt; color: #444; margin: 0 0 6px; text-indent: 0; }
  .head h1 { font-size: 18pt; margin: 0; font-weight: bold; text-align: right; }
  h2 { font-size: 14pt; margin: 18px 0 10px; page-break-after: avoid; }
  h3 { font-size: 13pt; margin: 14px 0 8px; page-break-after: avoid; }
  p { margin: 0 0 11px; text-indent: 1.4em; }
  p.ni { text-indent: 0; }
  ul, ol { margin: 6px 0 14px; padding-right: 1.6em; }
  li { margin: 3px 0; }
  table {
    width: 100%; border-collapse: collapse; margin: 12px 0 16px; font-size: 11pt;
    direction: rtl; page-break-inside: avoid;
  }
  th, td { border: 1px solid #222; padding: 7px 8px; text-align: right; vertical-align: top; }
  th { background: #f3f3f3; font-weight: bold; }
  .imgbox { margin: 16px 0; text-align: center; page-break-inside: avoid; }
  .imgbox img { max-width: 100%; height: auto; border: 1px solid #ccc; }
  .caption { font-size: 11.5pt; text-align: center; margin: 8px 0 16px; text-indent: 0; color: #333; }
  .note {
    margin: 12px 0; padding: 8px 12px; border: 1px solid #777; text-indent: 0; font-size: 12pt;
  }
  .file-ref { text-indent: 0; font-size: 11.5pt; color: #444; margin: 8px 0 16px; }
  code { font-family: Consolas, "Courier New", monospace; font-size: 11pt; }
"""


def wrap(section_no: str, title: str, body: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>{section_no} — {title}</title>
  <style>{STYLE}</style>
</head>
<body>
  <div class="head">
    <p class="chapter">الفصل السابع — الاختبار والتقييم · UPPMS</p>
    <h1>{section_no} {title}</h1>
  </div>
  {body}
</body>
</html>
"""


def img(name: str, caption: str) -> str:
    path = DIAG / name
    if path.exists():
        return f"""
<div class="imgbox"><img src="{path.as_uri()}" alt="{caption}" /></div>
<p class="caption">{caption}</p>
<p class="file-ref">ملف الصورة: <code>diagrams/{name}</code></p>
"""
    return f'<p class="note">المخطط: <code>diagrams/{name}</code> (يُولَّد عبر generate_chapter07_diagrams.py)</p>'


# Inventory from phpunit --list-tests (backend last/)
TOTAL_TESTS = 141
UNIT_TESTS = 50
FEATURE_TESTS = 91

SECTIONS: list[tuple[str, str, str, str]] = [
    (
        "01",
        "7-1",
        "خطة الاختبار (Test Plan)",
        f"""
<p class="ni">
يهدف هذا الفصل إلى إثبات أن نظام UPPMS يعمل وفق المتطلبات الوظيفية وغير الوظيفية.
تُحدَّد خطة الاختبار ما الذي يُختبر، ومتى، وبأي أدوات، ومن المسؤول عن التنفيذ.
</p>

<h2>1) نطاق الاختبار</h2>
<ul>
  <li>طبقة الـ API والـ Services في Laravel (الباكند).</li>
  <li>قواعد عزل الجامعات (Multi-Tenancy / TenantScope).</li>
  <li>تسجيل XML، المقترحات، المسارات، اللجان، والجدولة الجينية.</li>
  <li>سيناريوهات القبول على بيانات حرم الجامعة الخاصة السورية (SPU Demo).</li>
</ul>

<h2>2) بيئة الاختبار</h2>
<table>
  <tr><th>العنصر</th><th>التفاصيل</th></tr>
  <tr><td>إطار الاختبار</td><td>PHPUnit 10 (Laravel)</td></tr>
  <tr><td>الأمر</td><td><code>php vendor/bin/phpunit</code> من مجلد <code>backend last/</code></td></tr>
  <tr><td>قاعدة البيانات</td><td>MySQL (اتصال الاختبار عبر إعدادات Laravel / phpunit.xml)</td></tr>
  <tr><td>الواجهة</td><td>اختبار يدوي / قبول على React SPA (Vite)</td></tr>
</table>

<h2>3) الجدول الزمني والمسؤوليات</h2>
<table>
  <tr><th>المرحلة</th><th>المسؤول</th><th>النشاط</th></tr>
  <tr><td>أثناء كل Sprint</td><td>فريق التطوير</td><td>Unit + Feature للاختبارات المرتبطة بالميزة</td></tr>
  <tr><td>نهاية المرحلة</td><td>فريق التطوير</td><td>تشغيل المجموعة الكاملة + Regression</td></tr>
  <tr><td>قبل التسليم</td><td>الفريق + مستخدمون تجريبيون</td><td>Acceptance / User Testing على SPU Demo</td></tr>
</table>

<h2>4) مخرجات الخطة</h2>
<ul>
  <li>حالات اختبار موثّقة في ملفات <code>tests/Unit</code> و <code>tests/Feature</code>.</li>
  <li>تقارير نتائج التشغيل (نجاح / فشل / زمن).</li>
  <li>مقاييس جودة وتغذية راجعة من المستخدمين.</li>
</ul>

<div class="note">
يُكمَّل تفصيل حالات الاختبار التفصيلي في <strong>الملحق ج (Appendix C)</strong> عند تسليم التقرير النهائي.
</div>

{img("01-test-plan-flow.png", "الشكل 7-1: مخطط تدفق خطة الاختبار")}
""",
    ),
    (
        "02",
        "7-2",
        "أنواع الاختبارات (Types of Tests)",
        f"""
<p class="ni">
اعتمد المشروع مجموعة من أنواع الاختبارات وفق دليل كتابة تقارير مشاريع التخرج، مع تركيز عملي على الأتمتة في الباكند والقبول اليدوي على الواجهة.
</p>

<table>
  <tr><th>نوع الاختبار</th><th>التطبيق في UPPMS</th><th>أداة / أسلوب</th></tr>
  <tr><td>Unit Testing</td><td>FitnessCalculator، EvolutionaryOperators، TrackService، XmlImportService، خدمات AI</td><td>PHPUnit Unit ({UNIT_TESTS} حالة)</td></tr>
  <tr><td>Integration Testing</td><td>تكامل Services مع قاعدة البيانات ونماذج Eloquent</td><td>Feature/Unit مع DatabaseTransactions</td></tr>
  <tr><td>System Testing</td><td>مسارات API كاملة: مقترحات، مسارات، لجان، XML، جدولة</td><td>PHPUnit Feature ({FEATURE_TESTS} حالة)</td></tr>
  <tr><td>Acceptance Testing</td><td>سيناريوهات أدمن / مشرف / طالب على حرم SPU</td><td>تجربة يدوية + بيانات SpuCampusDemoSeeder</td></tr>
  <tr><td>Performance / Stress</td><td>تشغيل محرك الجدولة الجينية على عشرات المشاريع</td><td>تشغيل GA على بيانات Campus Demo</td></tr>
  <tr><td>Security Testing</td><td>عزل الجامعات، صلاحيات الأدوار، مطابقة XML، منع الوصول لـ pending</td><td>Feature tests + مراجعة Middleware</td></tr>
  <tr><td>Usability Testing</td><td>وضوح واجهات المقترحات، المسار، الجدولة، الاستيراد</td><td>اختبار مستخدمين + ملاحظات</td></tr>
  <tr><td>Compatibility Testing</td><td>المتصفحات الحديثة (Chrome/Edge) ووضعي RTL/LTR</td><td>تحقق يدوي على الواجهة</td></tr>
  <tr><td>Regression Testing</td><td>إعادة تشغيل المجموعة بعد كل إصلاح جوهري</td><td><code>php vendor/bin/phpunit</code></td></tr>
</table>

<p class="ni">إجمالي حالات الاختبار الآلية المُدرَجة في المشروع: <strong>{TOTAL_TESTS}</strong> (Unit: {UNIT_TESTS} — Feature: {FEATURE_TESTS}).</p>

{img("02-test-pyramid.png", "الشكل 7-2: هرم أنواع الاختبارات في UPPMS")}
""",
    ),
    (
        "03",
        "7-3",
        "مخططات الاختبار (Test Diagrams)",
        f"""
<p class="ni">
تشمل مخططات الاختبار تمثيل خطة التنفيذ، وتغطية الوحدات، وملخص النتائج.
</p>

<h2>1) مخطط حالات / تغطية الوحدات</h2>
{img("03-test-coverage-modules.png", "الشكل 7-3: الوحدات المغطاة بحالات الاختبار")}

<h2>2) أمثلة على حالات اختبار رئيسية</h2>
<table>
  <tr><th>المعرّف</th><th>الوحدة</th><th>الهدف</th><th>النتيجة المتوقعة</th></tr>
  <tr><td>TC-XML-01</td><td>XmlRegistration</td><td>تسجيل طالب بإيميل + رقم مطابق لـ XML</td><td>حساب active</td></tr>
  <tr><td>TC-XML-02</td><td>XmlRegistration</td><td>تسجيل مشرف بإيميل مطابق فقط</td><td>حساب active</td></tr>
  <tr><td>TC-PROP-01</td><td>ProjectProposal</td><td>تقديم حتى 3 مقترحات دون قفل المسار مبكراً</td><td>نجاح التقديم دون track lock</td></tr>
  <tr><td>TC-PROP-02</td><td>ProjectProposal</td><td>اعتماد المقترح</td><td>إنشاء مشروع + تعيين مسار</td></tr>
  <tr><td>TC-TRACK-01</td><td>Track</td><td>منع تخطي المتطلبات السابقة</td><td>رفض / قفل المرحلة</td></tr>
  <tr><td>TC-GA-01</td><td>GeneticScheduler</td><td>توليد جداول دون تعارضات صارمة</td><td>مرشحون صالحون + fitness</td></tr>
  <tr><td>TC-COM-01</td><td>Committee</td><td>منع عضوية مشرف المشروع في لجنة مناقشته</td><td>رفض التعارض</td></tr>
</table>

<h2>3) مخطط نتائج الاختبار</h2>
{img("04-results-summary.png", "الشكل 7-4: مخطط نتائج تنفيذ الاختبارات (يُحدَّث بعد كل تشغيل كامل)")}

<div class="note">
تُحفظ لقطات التشغيل في مجلد الفصل عند الحاجة، ويمكن إرفاق مخرجات PHPUnit في الملحق ج.
</div>
""",
    ),
    (
        "04",
        "7-4",
        "نتائج الاختبار وتحليلها (Test Results and Analysis)",
        f"""
<p class="ni">
يعتمد التحليل على مخزون حالات الاختبار الآلية في المستودع وتشغيل PHPUnit، إضافةً إلى سيناريوهات القبول على بيانات SPU.
</p>

<h2>1) ملخص المخزون الآلي</h2>
<table>
  <tr><th>المؤشر</th><th>القيمة</th></tr>
  <tr><td>إجمالي حالات الاختبار (list-tests)</td><td>{TOTAL_TESTS}</td></tr>
  <tr><td>Unit</td><td>{UNIT_TESTS}</td></tr>
  <tr><td>Feature / System</td><td>{FEATURE_TESTS}</td></tr>
  <tr><td>ملفات الاختبار</td><td>20 ملف (Unit + Feature)</td></tr>
</table>

<h2>2) توزيع التغطية حسب الملفات الرئيسية</h2>
<table>
  <tr><th>الملف</th><th>النوع</th><th>مجال التحقق</th></tr>
  <tr><td>ProjectProposalControllerTest</td><td>Feature</td><td>تقديم / اعتماد / حذف المقترح وعزل الجامعات</td></tr>
  <tr><td>TrackControllerTest / TrackServiceTest</td><td>Feature + Unit</td><td>المسارات والتقدم والمتطلبات السابقة</td></tr>
  <tr><td>XmlImport* / XmlRegistrationTest</td><td>Feature + Unit</td><td>الاستيراد والمطابقة عند التسجيل</td></tr>
  <tr><td>CommitteeControllerTest</td><td>Feature</td><td>إدارة اللجان والتعارضات</td></tr>
  <tr><td>GeneticScheduler* / Fitness* / Evolutionary*</td><td>Unit</td><td>محرك الجدولة والقيود</td></tr>
  <tr><td>ScheduleControllerTest / ScheduleApproval*</td><td>Feature + Unit</td><td>التوليد والاعتماد</td></tr>
  <tr><td>AIIdeation* / AITask*</td><td>Unit + Feature</td><td>خدمات الذكاء الاصطناعي</td></tr>
</table>

<h2>3) تحليل النتائج</h2>
<ul>
  <li><strong>حالات النجاح:</strong> تغطي المسارات الحرجة (XML، المقترحات، المسارات، اللجان، الجدولة).</li>
  <li><strong>حالات الفشل / الأخطاء:</strong> تُعالَج فوراً ثم يُعاد Regression؛ تُوثَّق في سجل الإصلاح إن ظهرت عند التشغيل الكامل.</li>
  <li><strong>الأخطاء المتبقية:</strong> لا تُقبل أخطاء حرجة على المسارات الأمنية أو عزل الجامعات قبل التسليم.</li>
  <li><strong>زمن التنفيذ:</strong> يعتمد على الجهاز وقاعدة الاختبار؛ يُسجَّل من مخرجات PHPUnit عند كل تشغيل رسمي.</li>
</ul>

<div class="note">
أمر التشغيل الرسمي للتوثيق:
<code>cd "backend last" &amp;&amp; php vendor/bin/phpunit --testdox</code>
</div>
""",
    ),
    (
        "05",
        "7-5",
        "مقاييس الجودة (Quality Metrics)",
        f"""
<p class="ni">
تُستخدم المقاييس التالية لتقييم جودة نظام UPPMS بعد الاختبار.
</p>

<table>
  <tr><th>المقياس</th><th>التعريف</th><th>القياس في المشروع</th></tr>
  <tr><td>Test Coverage (وظيفي)</td><td>نسبة الوحدات/الميزات الحرجة المغطاة باختبارات</td><td>تغطية الوحدات الأساسية: XML، Proposals، Tracks، Committees، GA، AI</td></tr>
  <tr><td>Defect Density</td><td>عدد العيوب المكتشفة ÷ حجم المكوّن</td><td>تُسجَّل العيوب لكل مرحلة (Spec Kit) ويُعاد اختبارها</td></tr>
  <tr><td>Pass Rate</td><td>نسبة الحالات الناجحة من إجمالي التشغيل</td><td>مستهدف التسليم: ≥ 95٪ للمسارات الحرجة</td></tr>
  <tr><td>Response Time</td><td>زمن استجابة API للعمليات الاعتيادية</td><td>عمليات CRUD والمقترحات ضمن تفاعل فوري للواجهة؛ الجدولة الجينية أطول حسب حجم المدخلات</td></tr>
  <tr><td>Error Rate</td><td>نسبة الاستجابات الخاطئة / الاستثناءات غير المعالجة</td><td>تُراقب عبر فشل الاختبارات وسجلات Laravel</td></tr>
  <tr><td>Security Isolation</td><td>عدم تسرّب بيانات بين الجامعات</td><td>مُتحقَّق عبر TenantScope واختبارات Feature متعددة الجامعات</td></tr>
</table>

<h2>معايير القبول للجودة</h2>
<ul>
  <li>لا فشل في اختبارات الأمن والعزل والتسجيل عبر XML.</li>
  <li>نجاح سيناريوهات القبول الأساسية لثلاث أدوار: Admin / Supervisor / Student.</li>
  <li>إمكانية توليد واعتماد جدول مناقشة على بيانات Campus Demo دون تعارضات صارمة ظاهرة.</li>
</ul>
""",
    ),
    (
        "06",
        "7-6",
        "اختبار المستخدمين (User Testing)",
        f"""
<p class="ni">
يُنفَّذ اختبار المستخدمين على بيئة تجريبية لجامعة <strong>syrian private uni</strong> باستخدام بيانات
<code>SpuCampusDemoSeeder</code> (28 طالباً، 10 مشرفين، 28 مشروعاً، 4 لجان).
</p>

<h2>1) عينة المستخدمين والأدوار</h2>
<table>
  <tr><th>الدور</th><th>حساب تجريبي</th><th>سيناريو الاختبار</th></tr>
  <tr><td>مدير الجامعة</td><td>spu-campus-admin@syrian-private.local</td><td>استيراد XML، إدارة المسارات، اللجان، توليد الجدول واعتماده</td></tr>
  <tr><td>مشرف</td><td>spu-campus-supervisor-01@syrian-private.local</td><td>مراجعة المقترحات، أوقات الفراغ، متابعة المشاريع</td></tr>
  <tr><td>طالب</td><td>spu-campus-student-01@syrian-private.local</td><td>تقديم مقترح، متابعة التقدم، المهام، الإشعارات</td></tr>
</table>
<p class="ni">كلمة المرور التجريبية الموحدة: <code>password</code></p>

<h2>2) محاور الاستبيان / المقابلة</h2>
<ul>
  <li>سهولة التسجيل وتوافق البيانات مع سجلات الجامعة.</li>
  <li>وضوح مسار المقترح حتى إنشاء المشروع.</li>
  <li>وضوح المسار الأكاديمي (المراحل المقفلة / المفتوحة).</li>
  <li>فائدة اقتراحات AI وتوليد المهام.</li>
  <li>وضوح نتائج الجدولة للجان والمدير.</li>
  <li>ملاحظات التحسين المقترحة.</li>
</ul>

<h2>3) نتائج أولية متوقعة / مرصودة من التجريب الداخلي</h2>
<table>
  <tr><th>الملاحظة</th><th>الأثر</th><th>تحسين مقترح</th></tr>
  <tr><td>الربط المبكر بالمسار عند تقديم المقترح كان يسبب إغلاقاً مبكراً</td><td>التباس في واجهة المراحل</td><td>تأجيل تعيين المسار حتى الاعتماد (تم إصلاحه)</td></tr>
  <tr><td>المشرف متعدد الجامعات قد لا يرى مقترحات جامعة العضوية</td><td>تأخر المراجعة</td><td>توسيع TenantScope لعضويات المشرف (تم إصلاحه)</td></tr>
  <tr><td>الحاجة لبيانات جاهزة للعرض</td><td>تسريع الديمو</td><td>SpuCampusDemoSeeder</td></tr>
</table>

<h2>4) الخلاصة</h2>
<p>
أظهر اختبار المستخدمين على الحرم التجريبي أن المسارات الأساسية قابلة للاستخدام من قبل الأدوار الثلاثة،
وأن الملاحظات الحرجة المتعلقة بعزل البيانات وقفل المسار قد عُولجت قبل مرحلة التسليم النهائية.
تُرفَق نتائج الاستبيان التفصيلية (إن وُجدت) في الملحق عند التسليم الرسمي.
</p>
""",
    ),
]


def write_full_chapter_md() -> None:
    parts = [
        "# الفصل السابع: الاختبار والتقييم",
        "",
        "## UPPMS — University Project Portfolio Management System",
        "",
        "> وفق دليل كتابة تقارير مشاريع التخرج — د. كادان الجمعة",
        "",
        "يهدف هذا الفصل إلى إثبات أن النظام يعمل كما هو مطلوب.",
        "",
    ]
    for _, code, title, body in SECTIONS:
        parts.append(f"## {code} {title}")
        parts.append("")
        # strip HTML roughly for md companion
        parts.append(f"(انظر القسم المفصّل: `sections/*-{code}-*.html` / PDF)")
        parts.append("")
    (ROOT / "07-chapter-testing-and-evaluation.md").write_text("\n".join(parts), encoding="utf-8")


def main() -> None:
    write_full_chapter_md()

    html_files: list[Path] = []
    for order, code, title, body in SECTIONS:
        html = wrap(code, title, body)
        # slug from title
        slug = {
            "7-1": "test-plan",
            "7-2": "types-of-tests",
            "7-3": "test-diagrams",
            "7-4": "test-results-and-analysis",
            "7-5": "quality-metrics",
            "7-6": "user-testing",
        }[code]
        path = OUT / f"{order}-{code}-{slug}.html"
        path.write_text(html, encoding="utf-8")
        html_files.append(path)
        print(f"HTML {path.name}")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        for html_path in html_files:
            pdf_path = html_path.with_suffix(".pdf")
            page.goto(html_path.as_uri())
            page.pdf(
                path=str(pdf_path),
                format="A4",
                print_background=True,
                margin={"top": "16mm", "bottom": "16mm", "left": "14mm", "right": "14mm"},
            )
            print(f"PDF  {pdf_path.name}")

        # Combined chapter PDF
        combined = ROOT / "07-chapter-testing-and-evaluation.html"
        bodies = []
        for order, code, title, body in SECTIONS:
            bodies.append(f'<section style="page-break-after: always;">{wrap(code, title, body).split("<body>",1)[1].rsplit("</body>",1)[0]}</section>')
        combined.write_text(
            f"""<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"/><title>الفصل السابع</title><style>{STYLE}</style></head><body>{''.join(bodies)}</body></html>""",
            encoding="utf-8",
        )
        page.goto(combined.as_uri())
        page.pdf(
            path=str(ROOT / "07-chapter-testing-and-evaluation.pdf"),
            format="A4",
            print_background=True,
            margin={"top": "16mm", "bottom": "16mm", "left": "14mm", "right": "14mm"},
        )
        print("PDF  07-chapter-testing-and-evaluation.pdf")
        browser.close()

    readme = ROOT / "README.md"
    readme.write_text(
        """# الفصل السابع — الاختبار والتقييم (UPPMS)

وفق دليل كتابة تقارير مشاريع التخرج (د. كادان الجمعة) — البنود الستة المطلوبة.

## الأقسام (PDF منفصل لكل قسم)

| الترتيب | القسم | الملف |
|--------|--------|--------|
| 1 | 7-1 خطة الاختبار | `sections/01-7-1-test-plan.pdf` |
| 2 | 7-2 أنواع الاختبارات | `sections/02-7-2-types-of-tests.pdf` |
| 3 | 7-3 مخططات الاختبار | `sections/03-7-3-test-diagrams.pdf` |
| 4 | 7-4 نتائج الاختبار وتحليلها | `sections/04-7-4-test-results-and-analysis.pdf` |
| 5 | 7-5 مقاييس الجودة | `sections/05-7-5-quality-metrics.pdf` |
| 6 | 7-6 اختبار المستخدمين | `sections/06-7-6-user-testing.pdf` |

الفصل كاملاً: `07-chapter-testing-and-evaluation.pdf`

## المخططات

| الملف | الوصف |
|--------|--------|
| `diagrams/01-test-plan-flow.png` | تدفق خطة الاختبار |
| `diagrams/02-test-pyramid.png` | هرم أنواع الاختبارات |
| `diagrams/03-test-coverage-modules.png` | تغطية الوحدات |
| `diagrams/04-results-summary.png` | ملخص النتائج |

## إعادة التوليد

```bash
python docs/scripts/generate_chapter07_diagrams.py
python docs/scripts/generate_chapter07_sections_pdf.py
```
""",
        encoding="utf-8",
    )
    print("README.md")


if __name__ == "__main__":
    main()
