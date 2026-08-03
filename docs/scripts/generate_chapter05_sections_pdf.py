#!/usr/bin/env python3
"""Generate Chapter 5 as separate ordered PDF sections + keep diagrams as images."""
from __future__ import annotations

from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / "chapter-05-high-level-design"
OUT = ROOT / "sections"
DIAG = ROOT / "diagrams"

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
  .head .code { font-size: 11pt; color: #555; margin-top: 4px; text-indent: 0; }
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
  .imgbox {
    margin: 16px 0; text-align: center; page-break-inside: avoid;
  }
  .imgbox img { max-width: 100%; height: auto; border: 1px solid #ccc; }
  .caption { font-size: 11.5pt; text-align: center; margin: 8px 0 16px; text-indent: 0; color: #333; }
  .note {
    margin: 12px 0; padding: 8px 12px; border: 1px solid #777; text-indent: 0; font-size: 12pt;
  }
  .file-ref { text-indent: 0; font-size: 11.5pt; color: #444; margin: 8px 0 16px; }
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
    <p class="chapter">الفصل الخامس — التصميم عالي المستوى · UPPMS</p>
    <h1>{section_no} {title}</h1>
  </div>
  {body}
</body>
</html>
"""


# Ordered exactly like the SPU guide image.
SECTIONS: list[tuple[str, str, str]] = [
    (
        "5-1-1",
        "System Block Diagram",
        f"""
<p class="ni">يوضح مخطط الكتل المكوّنات الرئيسية لنظام UPPMS وتفاعلها مع الواجهة والخدمات الخارجية.</p>
<div class="imgbox">
  <img src="{DIAG.as_uri()}/01-system-block-diagram.png" alt="System Block Diagram" />
</div>
<p class="caption">الشكل 5-1: System Block Diagram</p>
<p class="file-ref">ملف الصورة المنفصل: <code>diagrams/01-system-block-diagram.png</code></p>
<table>
  <tr><th>المكوّن</th><th>الوصف</th></tr>
  <tr><td>Web Browser (React SPA)</td><td>واجهة المستخدم في المتصفح</td></tr>
  <tr><td>Frontend Layer</td><td>React + MUI + Router</td></tr>
  <tr><td>API Layer</td><td>Laravel Controllers (REST)</td></tr>
  <tr><td>Business Layer</td><td>Services + Scheduling GA</td></tr>
  <tr><td>Data Layer</td><td>Eloquent Models + TenantScope</td></tr>
  <tr><td>MySQL</td><td>قاعدة البيانات</td></tr>
  <tr><td>Google Gemini API</td><td>أفكار المشاريع وتوليد المهام</td></tr>
  <tr><td>GitHub OAuth + API</td><td>ربط الحساب والمستودع</td></tr>
</table>
""",
    ),
    (
        "5-1-2",
        "Architecture Pattern",
        f"""
<p class="ni">
المعمارية المستخدمة في نظام UPPMS هي مزيج من ثلاثة أنماط متوافقة مع طبيعة النظام:
</p>
<div class="imgbox">
  <img src="{DIAG.as_uri()}/02-architecture-layers.png" alt="Architecture Pattern" />
</div>
<p class="caption">الشكل 5-2: Architecture Pattern Used in UPPMS</p>
<p class="file-ref">ملف الصورة المنفصل: <code>diagrams/02-architecture-layers.png</code></p>

<ol>
  <li>
    <strong>Client-Server + SPA:</strong>
    العميل هو تطبيق React أحادي الصفحة، والخادم هو Laravel REST API يتواصلان عبر HTTPS وJSON.
  </li>
  <li>
    <strong>Layered Architecture:</strong>
    على الخادم تُنظَّم الطبقات إلى:
    API Layer (Routes + Controllers) ثم Business Layer (Services + Genetic Scheduler)
    ثم Data Access Layer (Eloquent + TenantScope) ثم Database Layer (MySQL).
  </li>
  <li>
    <strong>Multi-Tenant SaaS:</strong>
    قاعدة بيانات مشتركة مع عزل منطقي لكل جامعة عبر <code>university_id</code>.
  </li>
</ol>

<p class="ni">لماذا هذه المعمارية؟</p>
<ul>
  <li>تفصل الواجهة عن منطق العمل.</li>
  <li>تجعل Controllers رفيعة وServices مسؤولة عن القواعد.</li>
  <li>تدعم تشغيل عدة جامعات على نفس المنصة بأمان.</li>
</ul>
""",
    ),
    (
        "5-1-3",
        "System Architecture Design",
        f"""
<p class="ni">
هذا القسم هو <strong>الشرح النصي لمخطط الكتل</strong> الوارد في القسم 5-1-1
(<code>diagrams/01-system-block-diagram.png</code>). يفسّر أجزاء المخطط وعلاقاتها كما هي مرسومة.
</p>
<div class="imgbox">
  <img src="{DIAG.as_uri()}/01-system-block-diagram.png" alt="System Block Diagram reference" />
</div>
<p class="caption">مرجع الشكل 5-1: System Block Diagram (للتوضيح مع الشرح)</p>

<h2>أولاً: جهة Clients</h2>
<p>
يظهر على يسار المخطط مكوّن <strong>Web Browser — React SPA</strong>. هذا هو مدخل المستخدم إلى النظام:
يفتح المتصفح تطبيق React، ومن خلاله تتم كل التفاعلات (تسجيل، مشاريع، جدولة، …).
السهم من المتصفح إلى Frontend Layer يعني أن الواجهة تعمل داخل المتصفح ولا تُعرض من خادم Blade.
</p>

<h2>ثانياً: صندوق UPPMS System</h2>
<p class="ni">يتوسط المخطط النظام نفسه مقسوماً إلى أربع طبقات متتابعة:</p>

<h3>1) Frontend Layer — React + MUI + Router</h3>
<p>
تمثل صفحات ومكوّنات الواجهة. تستقبل إدخال المستخدم، وتعرض النتائج، وتبني طلبات الـ API.
ترتبط بالطبقة التالية بسهم مكتوب عليه <strong>REST JSON + Bearer Token</strong>، أي أن الاتصال ليس بجلسة متصفح تقليدية بل بطلبات JSON مع توكن Sanctum.
</p>

<h3>2) API Layer — Laravel Controllers</h3>
<p>
تستقبل الطلبات القادمة من الواجهة عبر مسارات <code>/api</code>. الـ Controllers هنا طبقة دخول فقط:
تتحقق من صحة الطلب ثم تمرّره إلى طبقة الأعمال، ولا تحتفظ بمنطق الأعمال الثقيل داخلها.
</p>

<h3>3) Business Layer — Services + Scheduling GA</h3>
<p>
هنا يُنفَّذ منطق النظام: المقترحات، المسارات، الاستيراد، الجدولة، … بما في ذلك محرك الجدولة الجينية.
من هذه الطبقة يخرج سهمان إلى الخدمات الخارجية:
<strong>Google Gemini API</strong> (للذكاء الاصطناعي) و<strong>GitHub OAuth + API</strong> (لربط الحساب والمستودع).
كما يوجد سهم من API Layer إلى GitHub لأن مسار OAuth يمر عبر الـ Controllers أيضاً.
</p>

<h3>4) Data Layer — Eloquent Models</h3>
<p>
تمثّل نماذج البيانات وعزل الجامعة. السهم منها إلى <strong>MySQL Database</strong> يعني أن كل قراءة/كتابة دائمة تتم عبر هذه الطبقة إلى قاعدة البيانات.
</p>

<h2>ثالثاً: جهة External Services</h2>
<ul>
  <li><strong>MySQL Database:</strong> التخزين الدائم لبيانات الجامعات والمشاريع والجداول.</li>
  <li><strong>Google Gemini API:</strong> خدمة خارجية يستدعيها Business Layer لتوليد الأفكار/المهام.</li>
  <li><strong>GitHub OAuth + API:</strong> خدمة خارجية للتفويض ومزامنة المستودع؛ ترتبط بـ API Layer وBusiness Layer حسب العملية.</li>
</ul>

<h2>رابعاً: قراءة أسهم المخطط بإيجاز</h2>
<ol>
  <li>Browser → Frontend: تشغيل الواجهة في المتصفح.</li>
  <li>Frontend → API: طلبات REST مع التوكن.</li>
  <li>API → Business: تحويل الطلب إلى منطق عمل.</li>
  <li>Business → Data → MySQL: حفظ واسترجاع البيانات.</li>
  <li>Business → Gemini / GitHub: تكامل خارجي عند الحاجة.</li>
</ol>
<p>
بهذا يكون نص 5-1-3 شرحاً مباشراً لعناصر مخطط 5-1-1 وروابطها، وليس وصفاً عاماً لوظائف النظام بمعزل عن المخطط.
</p>
""",
    ),
    (
        "5-2-1",
        "ER Diagram",
        f"""
<p class="ni">يوضح مخطط الكيانات-العلاقات الكيانات الأساسية وعلاقاتها في نظام UPPMS.</p>
<div class="imgbox">
  <img src="{DIAG.as_uri()}/03-erd-overview.png" alt="ER Diagram" />
</div>
<p class="caption">الشكل 5-3: ER Diagram Overview</p>
<p class="file-ref">ملف الصورة المنفصل: <code>diagrams/03-erd-overview.png</code></p>
<p class="ni">أهم العلاقات:</p>
<ul>
  <li>الجامعة تضم المستخدمين والمشاريع والمسارات والجداول واللجان.</li>
  <li>المقترح المعتمد ينشئ مشروعاً.</li>
  <li>المسار يحتوي مراحل هرمية؛ تقدّم الطالب يرتبط بمرحلة المسار.</li>
  <li>الجدول المعتمد يُنشئ جلسات مناقشة قد ترتبط بلجنة.</li>
  <li>XML يحدد المستخدمين المصرّح لهم قبل/عند التسجيل.</li>
</ul>
""",
    ),
    (
        "5-2-2",
        "Relational Schema",
        """
<p class="ni">الجداول الرئيسية وعلاقتها بالغرض الوظيفي:</p>
<table>
  <tr><th>الجدول</th><th>الغرض</th></tr>
  <tr><td>universities</td><td>المستأجر (الجامعة)</td></tr>
  <tr><td>roles / users</td><td>الأدوار والمستخدمون</td></tr>
  <tr><td>projects / tasks / comments</td><td>المشاريع والتعاون</td></tr>
  <tr><td>project_proposals</td><td>مقترحات المشاريع</td></tr>
  <tr><td>tracks / track_stages / student_progress</td><td>المسارات والتقدّم</td></tr>
  <tr><td>academic_stages_config / available_rooms / doctor_availabilities</td><td>إعداد الجدولة</td></tr>
  <tr><td>approved_schedules / defense_sessions</td><td>الجداول والجلسات</td></tr>
  <tr><td>committees / committee_members / committee_assignments</td><td>اللجان</td></tr>
  <tr><td>xml_authorized_users / xml_import_logs</td><td>استيراد XML</td></tr>
  <tr><td>notifications / personal_access_tokens</td><td>الإشعارات والتوكنات</td></tr>
</table>
<h2>حقول مختصرة للجداول الأهم</h2>
<p class="ni"><strong>users:</strong> id, name, email, password, role_id, university_id, track_id, student_number, status, github_token.</p>
<p class="ni"><strong>projects:</strong> id, university_id, owner_id, supervisor_id, proposal_id, title, description, status.</p>
<p class="ni"><strong>project_proposals:</strong> id, student_id, supervisor_id, track_stage_id, title, description, status, resubmission_count.</p>
<p class="ni"><strong>track_stages:</strong> track_id, parent_id, sequence_order, stage_kind, is_decisive, academic_stage_id.</p>
<p class="ni"><strong>student_progress:</strong> student_id, track_id, track_stage_id, status.</p>
<p class="ni"><strong>defense_sessions:</strong> approved_schedule_id, project_id, room_id, committee_id, schedule fields, status.</p>
<p class="ni"><strong>xml_authorized_users:</strong> university_number, email, user_type, is_used, registered_user_id.</p>
<div class="note">تفاصيل إضافية: <code>schemas/relational-schema.md</code></div>
""",
    ),
    (
        "5-2-3",
        "Constraints and Keys",
        """
<h2>Primary Keys</h2>
<p>كل الجداول التشغيلية تستخدم <code>id</code> كمفتاح أساسي.</p>

<h2>Foreign Keys (أهم الروابط)</h2>
<ul>
  <li>users → roles / universities / tracks</li>
  <li>projects → universities / users / project_proposals</li>
  <li>project_proposals → users / track_stages</li>
  <li>track_stages → tracks / academic_stages_config / self(parent_id)</li>
  <li>student_progress → users / tracks / track_stages</li>
  <li>defense_sessions → approved_schedules / projects / rooms / committees</li>
  <li>committee_assignments → defense_sessions / users</li>
  <li>xml_authorized_users → universities / users</li>
</ul>

<h2>Unique Constraints</h2>
<ul>
  <li>users.email</li>
  <li>(university_id, student_number) على users</li>
  <li>(university_id, name) على tracks و committees</li>
  <li>(student_id, track_id, track_stage_id) على student_progress</li>
  <li>(university_id, university_number, email, user_type) على xml_authorized_users</li>
</ul>

<h2>Status / Enum Values</h2>
<table>
  <tr><th>الكيان</th><th>الحقل</th><th>القيم</th></tr>
  <tr><td>users</td><td>status</td><td>pending, active, rejected, graduated</td></tr>
  <tr><td>project_proposals</td><td>status</td><td>pending, approved, rejected</td></tr>
  <tr><td>tasks</td><td>status</td><td>pending, in_progress, completed</td></tr>
  <tr><td>student_progress</td><td>status</td><td>in_progress, passed, failed, incomplete</td></tr>
  <tr><td>approved_schedules</td><td>status</td><td>active, voided</td></tr>
  <tr><td>defense_sessions</td><td>status</td><td>scheduled, completed, cancelled</td></tr>
</table>

<h2>قواعد أعمال</h2>
<ul>
  <li>لا أكثر من مقترح pending نشط لنفس الطالب.</li>
  <li>عزل المستأجر عبر university_id + TenantScope.</li>
  <li>مطابقة XML عند التسجيل تفعّل الحساب.</li>
  <li>جدول معتمد نشط واحد لكل مرحلة أكاديمية.</li>
  <li>لا SoftDeletes؛ تُستخدم حالات voided / cancelled / is_active.</li>
</ul>
<div class="note">تفاصيل إضافية: <code>schemas/constraints-and-keys.md</code></div>
""",
    ),
    (
        "5-3",
        "External APIs Design",
        """
<p>يشمل هذا القسم الواجهات الخارجية التي يستهلكها النظام، مع ملخص لمسارات REST الداخلية التي تخدم الواجهة.</p>

<h2>1) Google Gemini API</h2>
<table>
  <tr><th>البند</th><th>التفاصيل</th></tr>
  <tr><td>الاستخدام</td><td>اقتراح أفكار مشاريع + توليد مهام</td></tr>
  <tr><td>Method / Path</td><td>POST …/models/{model}:generateContent</td></tr>
  <tr><td>Auth</td><td>x-goog-api-key (GEMINI_API_KEY)</td></tr>
  <tr><td>Model</td><td>gemini-2.5-flash</td></tr>
  <tr><td>Services</td><td>AIIdeationService, AITaskService</td></tr>
  <tr><td>UPPMS Routes</td><td>POST /api/ai/suggest-projects — POST /api/projects/{project}/generate-tasks</td></tr>
  <tr><td>Errors</td><td>مفتاح غير صالح، 429، JSON غير صالح</td></tr>
</table>

<h2>2) GitHub OAuth + REST API</h2>
<table>
  <tr><th>البند</th><th>التفاصيل</th></tr>
  <tr><td>الاستخدام</td><td>ربط الحساب، مزامنة commits، دفع الإصدارات</td></tr>
  <tr><td>OAuth</td><td>GET /api/auth/github/redirect و /callback (scope: repo)</td></tr>
  <tr><td>API</td><td>api.github.com عبر GithubService و/أو users.github_token</td></tr>
  <tr><td>Errors</td><td>رفض التفويض، توكن منتهٍ، مستودع غير موجود</td></tr>
</table>

<h2>3) Internal REST API Groups</h2>
<table>
  <tr><th>المجموعة</th><th>أمثلة</th><th>Methods</th></tr>
  <tr><td>Auth</td><td>/register, /login, /logout</td><td>POST</td></tr>
  <tr><td>Users / XML</td><td>/users, /admin/xml-import/*</td><td>GET/POST</td></tr>
  <tr><td>Projects / Tasks</td><td>/projects, /task/*</td><td>CRUD</td></tr>
  <tr><td>Proposals / Tracks</td><td>/proposals, /tracks</td><td>GET/POST/PUT</td></tr>
  <tr><td>Schedules</td><td>/schedules/generate, /approve</td><td>POST/GET</td></tr>
  <tr><td>Committees</td><td>/committees, assign-committee</td><td>GET/POST/PUT</td></tr>
  <tr><td>AI / Platform</td><td>/ai/*, /admin/universities</td><td>POST/GET</td></tr>
</table>
<p class="ni">Auth: Bearer Sanctum. Codes: 200/201, 401, 403, 404, 422, 429.</p>
<div class="note">تفاصيل إضافية: <code>schemas/external-and-internal-apis.md</code></div>
""",
    ),
    (
        "5-4",
        "Security and Permissions Design",
        """
<h2>1) المصادقة</h2>
<table>
  <tr><th>العنصر</th><th>التنفيذ</th></tr>
  <tr><td>الآلية</td><td>Laravel Sanctum — Personal Access Tokens</td></tr>
  <tr><td>التخزين</td><td>localStorage + Authorization: Bearer</td></tr>
  <tr><td>Logout</td><td>حذف التوكن الحالي</td></tr>
  <tr><td>ملاحظة</td><td>ليست JWT؛ الجدول personal_access_tokens</td></tr>
</table>

<h2>2) الأدوار</h2>
<table>
  <tr><th>الدور</th><th>الاسم</th><th>الصلاحية</th></tr>
  <tr><td>Student</td><td>student</td><td>مقترحات، مشاريع، مهام، تقدّم</td></tr>
  <tr><td>Supervisor</td><td>supervisor</td><td>مراجعة مقترحات، إشراف، توافر، مناقشات</td></tr>
  <tr><td>University Admin</td><td>admin</td><td>مستخدمون، XML، مسارات، جدولة، لجان</td></tr>
  <tr><td>Super Admin</td><td>super_admin</td><td>إدارة الجامعات والمنصة</td></tr>
</table>

<h2>3) Middleware</h2>
<ul>
  <li><code>auth:sanctum</code> — توكن صالح.</li>
  <li><code>EnsureUserHasUniversity</code> — ارتباط بجامعة (إلا super_admin).</li>
  <li><code>user.status</code> — active أو graduated فقط.</li>
  <li><code>role:...</code> — تقييد حسب الدور.</li>
  <li><code>TenantScope</code> — عزل بيانات الجامعة.</li>
</ul>

<h2>4) التسجيل والاعتماد</h2>
<ol>
  <li>استيراد XML للمستخدمين المصرّح لهم.</li>
  <li>تطابق XML → active، وإلا pending.</li>
  <li>المدير يوافق أو يرفض.</li>
  <li>pending/rejected لا يدخلان الـ API المحمي.</li>
</ol>

<h2>5) Multi-Tenancy</h2>
<p>
السجلات تحمل university_id. BelongsToUniversity + TenantScope يمنعان رؤية بيانات جامعة أخرى.
super_admin يتجاوز النطاق لإدارة المنصة.
</p>
""",
    ),
]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    # Clean previous section PDFs
    for old in OUT.glob("*.pdf"):
        old.unlink()
    for old in OUT.glob("*.html"):
        old.unlink()

    index_lines = [
        "# الفصل الخامس — أقسام منفصلة (حسب ترتيب دليل الأطروحة)",
        "",
        "## ترتيب الأقسام",
        "",
        "| # | القسم | ملف الكتابة (PDF) | صورة المخطط |",
        "|---|--------|-------------------|-------------|",
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        for i, (num, title, body) in enumerate(SECTIONS, start=1):
            fname = f"{i:02d}-{num}-{title.lower().replace(' ', '-')}"
            html_path = OUT / f"{fname}.html"
            pdf_path = OUT / f"{fname}.pdf"
            html_path.write_text(wrap(num, title, body), encoding="utf-8")
            page.goto(html_path.resolve().as_uri(), wait_until="networkidle")
            page.wait_for_timeout(600)
            page.pdf(
                path=str(pdf_path),
                format="A4",
                print_background=True,
                margin={"top": "16mm", "bottom": "16mm", "left": "14mm", "right": "14mm"},
            )
            img = ""
            if num == "5-1-1":
                img = "`diagrams/01-system-block-diagram.png`"
            elif num == "5-1-2":
                img = "`diagrams/02-architecture-layers.png`"
            elif num == "5-2-1":
                img = "`diagrams/03-erd-overview.png`"
            else:
                img = "—"
            index_lines.append(f"| {i} | {num} {title} | `{pdf_path.name}` | {img} |")
            print(f"OK {pdf_path.name} ({pdf_path.stat().st_size})")
        browser.close()

    index_lines.extend(
        [
            "",
            "## المجلدات",
            "",
            "- `sections/` → ملفات الكتابة PDF منفصلة ومرتبة",
            "- `diagrams/` → المخططات كصور PNG",
            "",
            "## إعادة التوليد",
            "",
            "```bash",
            "python docs/scripts/generate_chapter05_diagrams.py",
            "python docs/scripts/generate_chapter05_sections_pdf.py",
            "```",
            "",
        ]
    )
    (OUT / "README.md").write_text("\n".join(index_lines), encoding="utf-8")
    (ROOT / "README.md").write_text(
        "\n".join(
            [
                "# الفصل الخامس — التصميم عالي المستوى (UPPMS)",
                "",
                "مرتّب حسب دليل الأطروحة، مع فصل الكتابة عن المخططات.",
                "",
                "## 1) الكتابة (PDF منفصل لكل قسم)",
                "",
                "المجلد: [`sections/`](sections/)",
                "",
                "| الترتيب | القسم | الملف |",
                "|---------|--------|--------|",
                "| 1 | 5-1-1 System Block Diagram | `sections/01-5-1-1-system-block-diagram.pdf` |",
                "| 2 | 5-1-2 Architecture Pattern | `sections/02-5-1-2-architecture-pattern.pdf` |",
                "| 3 | 5-1-3 System Architecture Design | `sections/03-5-1-3-system-architecture-design.pdf` |",
                "| 4 | 5-2-1 ER Diagram | `sections/04-5-2-1-er-diagram.pdf` |",
                "| 5 | 5-2-2 Relational Schema | `sections/05-5-2-2-relational-schema.pdf` |",
                "| 6 | 5-2-3 Constraints and Keys | `sections/06-5-2-3-constraints-and-keys.pdf` |",
                "| 7 | 5-3 External APIs Design | `sections/07-5-3-external-apis-design.pdf` |",
                "| 8 | 5-4 Security and Permissions | `sections/08-5-4-security-and-permissions-design.pdf` |",
                "",
                "## 2) المخططات (صور)",
                "",
                "المجلد: [`diagrams/`](diagrams/)",
                "",
                "| القسم | الصورة |",
                "|--------|--------|",
                "| 5-1-1 | `diagrams/01-system-block-diagram.png` |",
                "| 5-1-2 | `diagrams/02-architecture-layers.png` |",
                "| 5-2-1 | `diagrams/03-erd-overview.png` |",
                "",
                "## إعادة التوليد",
                "",
                "```bash",
                "python docs/scripts/generate_chapter05_diagrams.py",
                "python docs/scripts/generate_chapter05_sections_pdf.py",
                "```",
                "",
            ]
        ),
        encoding="utf-8",
    )
    print(f"Done — {len(SECTIONS)} section PDFs in {OUT}")


if __name__ == "__main__":
    main()
