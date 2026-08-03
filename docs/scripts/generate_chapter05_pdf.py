#!/usr/bin/env python3
"""Generate Chapter 5 textual content as PDF (diagrams remain separate PNGs)."""
from __future__ import annotations

from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / "chapter-05-high-level-design"
HTML_PATH = ROOT / "05-chapter-high-level-design.html"
PDF_PATH = ROOT / "05-chapter-high-level-design.pdf"

HTML = r"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>الفصل الخامس — التصميم عالي المستوى — UPPMS</title>
  <style>
    @page { size: A4; margin: 22mm 18mm 20mm 18mm; }
    body {
      font-family: "Traditional Arabic", "Times New Roman", Times, serif;
      font-size: 13.5pt;
      line-height: 1.85;
      color: #111;
      margin: 0;
      background: #fff;
      text-align: justify;
    }
    .cover {
      page-break-after: always;
      text-align: center;
      padding: 80px 30px 40px;
      min-height: 80vh;
    }
    .cover .label { font-size: 13pt; color: #333; margin-bottom: 40px; }
    .cover h1 {
      font-size: 20pt;
      font-weight: bold;
      line-height: 1.7;
      margin: 0 0 18px;
    }
    .cover .sub { font-size: 13pt; color: #333; margin-bottom: 60px; line-height: 1.8; }
    .cover .meta {
      font-size: 12pt;
      color: #444;
      border-top: 1px solid #000;
      display: inline-block;
      padding-top: 14px;
      min-width: 280px;
    }
    .toc { page-break-after: always; }
    .toc h2, h2.section {
      font-size: 15pt;
      font-weight: bold;
      margin: 28px 0 14px;
      text-align: right;
      page-break-after: avoid;
    }
    .toc ol { list-style: none; padding: 0; line-height: 2.1; font-size: 12.5pt; }
    .toc li { border-bottom: 1px dotted #999; padding: 3px 0; }
    h3 {
      font-size: 13.5pt;
      font-weight: bold;
      margin: 18px 0 10px;
      page-break-after: avoid;
    }
    h4 {
      font-size: 12.5pt;
      font-weight: bold;
      margin: 14px 0 8px;
    }
    p { margin: 0 0 11px; text-indent: 1.4em; }
    p.ni { text-indent: 0; }
    ul, ol { margin: 6px 0 14px; padding-right: 1.6em; }
    li { margin: 3px 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 16px;
      font-size: 11pt;
      direction: rtl;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #222;
      padding: 7px 8px;
      text-align: right;
      vertical-align: top;
    }
    th { background: #f3f3f3; font-weight: bold; }
    .fig {
      margin: 14px 0 18px;
      padding: 10px 12px;
      border: 1px solid #666;
      background: #fafafa;
      text-indent: 0;
      font-size: 12pt;
      page-break-inside: avoid;
    }
    .fig strong { display: block; margin-bottom: 4px; }
    .note {
      margin: 12px 0;
      padding: 8px 12px;
      border: 1px solid #777;
      text-indent: 0;
      font-size: 12pt;
    }
    footer {
      margin-top: 36px;
      padding-top: 10px;
      border-top: 1px solid #ccc;
      font-size: 10pt;
      text-align: center;
      color: #555;
    }
  </style>
</head>
<body>

<div class="cover">
  <div class="label">نظام إدارة مشاريع التخرج الجامعية<br/>UPPMS — University Project Portfolio Management System</div>
  <h1>الفصل الخامس<br/>التصميم عالي المستوى</h1>
  <p class="sub">
    وفق دليل كتابة أطروحة مشروع التخرج<br/>
    كلية هندسة الذكاء الاصطناعي — الجامعة السورية الخاصة (SPU)
  </p>
  <div class="meta">المخططات كصور منفصلة في مجلد diagrams/</div>
</div>

<div class="toc">
  <h2>المحتويات</h2>
  <ol>
    <li>5-1 التصميم عالي المستوى</li>
    <li>5-1-1 System Block Diagram</li>
    <li>5-1-2 Architecture Pattern</li>
    <li>5-1-3 System Architecture Design (الشرح النصي)</li>
    <li>5-2 تصميم قاعدة البيانات</li>
    <li>5-2-1 ER Diagram</li>
    <li>5-2-2 Relational Schema</li>
    <li>5-2-3 Constraints and Keys</li>
    <li>5-3 External APIs Design</li>
    <li>5-4 Security and Permissions Design</li>
  </ol>
</div>

<h2 class="section">5-1 التصميم عالي المستوى</h2>
<p>
يهدف هذا القسم إلى توضيح كيفية تنفيذ نظام UPPMS بناءً على التحليل السابق، من خلال تحديد المكوّنات الرئيسية،
نمط المعمارية المعتمد، والشرح النصي لآلية عمل النظام.
</p>

<h3>5-1-1 System Block Diagram</h3>
<p class="ni">
يوضح مخطط الكتل المكوّنات الأساسية للنظام وتفاعلها مع الخدمات الخارجية.
</p>
<div class="fig">
  <strong>الشكل 5-1: System Block Diagram</strong>
  ملف الصورة: <code>diagrams/01-system-block-diagram.png</code>
</div>
<p class="ni">مكوّنات المخطط:</p>
<table>
  <tr><th>المكوّن</th><th>الوصف</th></tr>
  <tr><td>Web Browser (React SPA)</td><td>واجهة المستخدم في المتصفح</td></tr>
  <tr><td>Frontend Layer</td><td>صفحات ومكوّنات React مع MUI وإدارة التوجيه</td></tr>
  <tr><td>API Layer</td><td>Laravel Controllers تستقبل طلبات REST</td></tr>
  <tr><td>Business Layer</td><td>Services ومحرك الجدولة الجينية</td></tr>
  <tr><td>Data Layer</td><td>Eloquent Models مع عزل الجامعات</td></tr>
  <tr><td>MySQL</td><td>قاعدة البيانات الرئيسية</td></tr>
  <tr><td>Google Gemini API</td><td>اقتراح أفكار المشاريع وتوليد المهام</td></tr>
  <tr><td>GitHub OAuth + API</td><td>ربط الحساب ومزامنة المستودع والإصدارات</td></tr>
</table>

<h3>5-1-2 Architecture Pattern</h3>
<p>
يعتمد نظام UPPMS على نمط معماري مركّب يناسب تطبيقات الويب الحديثة، ويجمع بين:
</p>
<ol>
  <li><strong>SPA + REST API:</strong> الواجهة الأمامية تطبيق React منفصل، والخلفية واجهة Laravel REST تحت المسار <code>/api</code>.</li>
  <li><strong>Layered Architecture:</strong> الطبقات على الخادم هي Routes → Controllers → Services → Models → Database، حيث يوجد منطق الأعمال في طبقة Services.</li>
  <li><strong>MVC داخل Laravel:</strong> Models تمثّل البيانات وControllers تنسّق الطلب/الرد، بينما واجهة العرض الأساسية هي React وليست Blade.</li>
  <li><strong>Multi-Tenant SaaS:</strong> عدة جامعات على قاعدة بيانات مشتركة مع عزل منطقي عبر <code>university_id</code> و<code>TenantScope</code>.</li>
</ol>
<div class="fig">
  <strong>الشكل 5-2: Architecture Layers</strong>
  ملف الصورة: <code>diagrams/02-architecture-layers.png</code>
</div>
<p class="ni">مبررات اختيار هذا النمط:</p>
<ul>
  <li>فصل الواجهة عن المنطق يسهّل التطوير والصيانة.</li>
  <li>طبقة Services تسمح بإعادة استخدام القواعد بين المقترحات والمسارات والجدولة.</li>
  <li>REST مع Bearer Token مناسب لتطبيق React أحادي الصفحة.</li>
  <li>عزل الجامعات ضروري لأن النظام متعدد المستأجرين.</li>
</ul>

<h3>5-1-3 System Architecture Design (شرح نصي للمخطط)</h3>
<p>
نظام UPPMS منصة لإدارة مشاريع التخرج داخل الجامعات. يتفاعل المستخدم (طالب، مشرف، مدير جامعة، أو مدير منصة)
مع واجهة React عبر المتصفح. ترسل الواجهة طلبات JSON إلى الـ API مع رمز Sanctum.
</p>
<p>
عند وصول الطلب، يمر عبر Middleware للتحقق من المصادقة، وارتباط المستخدم بجامعة، وحالة الحساب، والدور.
ثم يصل إلى الـ Controller المناسب الذي يستدعي Service لتنفيذ منطق العمل (مثل إنشاء مقترح، توليد جدول، استيراد XML).
يحفظ الـ Service النتائج عبر Eloquent Models في MySQL ضمن نطاق جامعة المستخدم.
</p>
<p class="ni">الوحدات الأساسية في النظام:</p>
<ul>
  <li><strong>Authentication &amp; Users:</strong> تسجيل، دخول، اعتماد الحسابات، الملف الشخصي.</li>
  <li><strong>Projects &amp; Proposals:</strong> مقترح → موافقة مشرف → مشروع، مع مهام وتعليقات ودعوات وإصدارات.</li>
  <li><strong>Academic Tracks:</strong> مسارات ومراحل وتقدّم طلابي مرتبط بنتائج المناقشات.</li>
  <li><strong>Scheduling:</strong> إعداد الغرف والتواريخ والتوافر، ثم توليد جدول بالخوارزمية الجينية (وضع فردي أو لجان)، ثم الاعتماد والإشعارات.</li>
  <li><strong>Committees:</strong> إدارة لجان المناقشة وربطها بالجلسات.</li>
  <li><strong>XML Import:</strong> استيراد المستخدمين المصرّح لهم ومطابقتهم عند التسجيل.</li>
  <li><strong>AI Services:</strong> Gemini لاقتراح الأفكار وتوليد المهام.</li>
  <li><strong>Platform Admin:</strong> إدارة الجامعات ومديريها عبر <code>super_admin</code>.</li>
</ul>
<p>
الخدمات الخارجية المستخدمة هي Gemini لتوليد المحتوى، وGitHub لربط الحساب ومستودع المشروع.
الإشعارات داخلية في قاعدة البيانات وتظهر في واجهة المستخدم للمشرفين والطلاب بعد اعتماد الجدول.
</p>

<h2 class="section">5-2 تصميم قاعدة البيانات</h2>

<h3>5-2-1 ER Diagram</h3>
<p>
يوضح مخطط الكيانات-العلاقات الكيانات الأساسية وعلاقاتها في جوهر النظام
(الجامعات، المستخدمون، المشاريع، المقترحات، المسارات، الجداول، الجلسات، اللجان، XML).
</p>
<div class="fig">
  <strong>الشكل 5-3: ER Diagram Overview</strong>
  ملف الصورة: <code>diagrams/03-erd-overview.png</code>
</div>
<p class="ni">أهم العلاقات:</p>
<ul>
  <li>الجامعة تضم المستخدمين والمشاريع والمسارات والجداول واللجان.</li>
  <li>المقترح المعتمد ينشئ مشروعاً (<code>project_proposals</code> → <code>projects</code>).</li>
  <li>المسار يحتوي مراحل هرمية؛ تقدّم الطالب يرتبط بمرحلة المسار.</li>
  <li>الجدول المعتمد يُنشئ جلسات مناقشة؛ الجلسة قد ترتبط بلجنة.</li>
  <li>XML يحدد المستخدمين المصرّح لهم قبل/عند التسجيل.</li>
</ul>

<h3>5-2-2 Relational Schema</h3>
<p class="ni">الجداول الرئيسية في النظام:</p>
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
  <tr><td>notifications</td><td>الإشعارات</td></tr>
  <tr><td>personal_access_tokens</td><td>رموز Sanctum</td></tr>
</table>
<div class="note">
التفاصيل العمودية الكاملة للحقول والأنواع موجودة في الملف النصي المساند:
<code>schemas/relational-schema.md</code>
</div>

<h4>ملخص حقول الجداول الأهم</h4>
<p class="ni"><strong>users:</strong> id, name, email (unique), password, role_id, university_id, track_id, student_number, status (pending/active/rejected/graduated), github_token.</p>
<p class="ni"><strong>projects:</strong> id, university_id, owner_id, supervisor_id, proposal_id, title, description, status, github_repo_url.</p>
<p class="ni"><strong>project_proposals:</strong> id, university_id, student_id, supervisor_id, track_stage_id, title, description, status (pending/approved/rejected), resubmission_count.</p>
<p class="ni"><strong>tracks / track_stages:</strong> المسار ومراحله الهرمية (parent_id, stage_kind, is_decisive, academic_stage_id).</p>
<p class="ni"><strong>student_progress:</strong> student_id, track_id, track_stage_id, status (in_progress/passed/failed/incomplete).</p>
<p class="ni"><strong>approved_schedules / defense_sessions:</strong> الجدول المعتمد وجلسات المناقشة (غرفة، وقت، لجنة، حالة).</p>
<p class="ni"><strong>committees:</strong> لجان المناقشة مع أعضاء chair/member.</p>
<p class="ni"><strong>xml_authorized_users:</strong> university_number, email, user_type (student/supervisor), is_used, registered_user_id.</p>

<h3>5-2-3 Constraints and Keys</h3>
<p class="ni"><strong>Primary Keys:</strong> جميع الجداول تستخدم <code>id</code> كمفتاح أساسي.</p>
<p class="ni"><strong>Foreign Keys:</strong> ربط المستخدم بالدور والجامعة، المشروع بالمقترح والمالك، المراحل بالمسار، الجلسات بالجدول والمشروع واللجنة، وسجلات XML بالجامعة.</p>
<p class="ni"><strong>Unique Constraints:</strong></p>
<ul>
  <li>users.email</li>
  <li>(university_id, student_number) على users</li>
  <li>(university_id, name) على tracks و committees</li>
  <li>(student_id, track_id, track_stage_id) على student_progress</li>
  <li>(university_id, university_number, email, user_type) على xml_authorized_users</li>
</ul>
<p class="ni"><strong>قواعد أعمال مهمة:</strong></p>
<ul>
  <li>لا أكثر من مقترح pending نشط لنفس الطالب.</li>
  <li>عزل المستأجر عبر university_id + TenantScope.</li>
  <li>مطابقة XML عند التسجيل تفعّل الحساب وتربط السجل.</li>
  <li>جدول معتمد واحد نشط لكل مرحلة أكاديمية.</li>
  <li>لا يوجد SoftDeletes؛ تُستخدم حالات مثل voided / cancelled / is_active.</li>
</ul>
<div class="note">التفاصيل الكاملة في: <code>schemas/constraints-and-keys.md</code></div>

<h2 class="section">5-3 External APIs Design</h2>
<p>
يستخدم النظام واجهات خارجية، ويعرّض أيضاً REST API داخلياً لواجهة React.
</p>

<h3>5-3-1 Google Gemini API</h3>
<table>
  <tr><th>البند</th><th>التفاصيل</th></tr>
  <tr><td>الاستخدام</td><td>اقتراح أفكار مشاريع + توليد مهام</td></tr>
  <tr><td>Method / Path</td><td>POST …/models/{model}:generateContent</td></tr>
  <tr><td>المصادقة</td><td>x-goog-api-key (GEMINI_API_KEY)</td></tr>
  <tr><td>النموذج</td><td>gemini-2.5-flash (افتراضي)</td></tr>
  <tr><td>خدمات UPPMS</td><td>AIIdeationService, AITaskService</td></tr>
  <tr><td>مسارات النظام</td><td>POST /api/ai/suggest-projects — POST /api/projects/{project}/generate-tasks</td></tr>
  <tr><td>الأخطاء</td><td>مفتاح غير صالح، حد المعدل، JSON غير صالح</td></tr>
</table>

<h3>5-3-2 GitHub OAuth + REST API</h3>
<table>
  <tr><th>البند</th><th>التفاصيل</th></tr>
  <tr><td>الاستخدام</td><td>ربط الحساب، مزامنة commits، دفع الإصدارات</td></tr>
  <tr><td>OAuth</td><td>GET /api/auth/github/redirect و /callback (Socialite, scope: repo)</td></tr>
  <tr><td>API</td><td>api.github.com عبر GithubService و/أو users.github_token</td></tr>
  <tr><td>الأخطاء</td><td>رفض التفويض، توكن منتهٍ، مستودع غير موجود</td></tr>
</table>

<h3>5-3-3 Internal REST API (ملخص)</h3>
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
<p class="ni">
المصادقة الداخلية: Bearer Token (Sanctum). أكواد شائعة: 200/201 نجاح، 401 غير مصادق، 403 ممنوع، 404 غير موجود، 422 تحقق فاشل، 429 حد معدل.
</p>

<h2 class="section">5-4 Security and Permissions Design</h2>

<h3>5-4-1 المصادقة</h3>
<table>
  <tr><th>العنصر</th><th>التنفيذ</th></tr>
  <tr><td>الآلية</td><td>Laravel Sanctum — Personal Access Tokens</td></tr>
  <tr><td>التخزين في العميل</td><td>localStorage + Authorization: Bearer</td></tr>
  <tr><td>تسجيل الخروج</td><td>حذف التوكن الحالي</td></tr>
  <tr><td>ملاحظة</td><td>ليست JWT؛ التوكنات في personal_access_tokens</td></tr>
</table>

<h3>5-4-2 الأدوار</h3>
<table>
  <tr><th>الدور</th><th>الاسم</th><th>الصلاحية العامة</th></tr>
  <tr><td>Student</td><td>student</td><td>مقترحات، مشاريع، مهام، تقدّم، دعوات</td></tr>
  <tr><td>Supervisor</td><td>supervisor</td><td>مراجعة مقترحات، إشراف، توافر، مناقشات</td></tr>
  <tr><td>University Admin</td><td>admin</td><td>مستخدمون، XML، مسارات، جدولة، لجان</td></tr>
  <tr><td>Super Admin</td><td>super_admin</td><td>إدارة الجامعات والمنصة</td></tr>
</table>

<h3>5-4-3 Middleware ومستويات الوصول</h3>
<ul>
  <li><code>auth:sanctum</code> — يتطلب توكن صالح.</li>
  <li><code>EnsureUserHasUniversity</code> — المستخدم مرتبط بجامعة (استثناء super_admin).</li>
  <li><code>user.status / CheckUserStatus</code> — يسمح فقط بـ active أو graduated.</li>
  <li><code>role:...</code> — تقييد المسارات حسب الدور.</li>
  <li><code>TenantScope</code> — عزل بيانات الجامعة تلقائياً.</li>
</ul>

<h3>5-4-4 دورة التسجيل والاعتماد</h3>
<ol>
  <li>مدير الجامعة يستورد XML للمستخدمين المصرّح لهم.</li>
  <li>عند التسجيل: إن وُجد تطابق XML يصبح الحساب active، وإلا pending.</li>
  <li>مدير الجامعة يوافق أو يرفض الحسابات المعلّقة.</li>
  <li>حسابات pending/rejected لا تدخل الـ API المحمي.</li>
</ol>

<h3>5-4-5 عزل البيانات (Multi-Tenancy)</h3>
<p>
كل سجل تشغيلي تقريباً يحمل university_id. السمة BelongsToUniversity مع TenantScope تمنع رؤية بيانات جامعة أخرى.
أما super_admin فيتجاوز النطاق لإدارة المنصة عبر الجامعات.
</p>

<footer>
UPPMS — الفصل الخامس: التصميم عالي المستوى<br/>
المخططات كصور في مجلد diagrams/ — النص في هذا الملف PDF
</footer>

</body>
</html>
"""


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    HTML_PATH.write_text(HTML, encoding="utf-8")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(HTML_PATH.resolve().as_uri(), wait_until="networkidle")
        page.wait_for_timeout(500)
        page.pdf(
            path=str(PDF_PATH),
            format="A4",
            print_background=True,
            margin={"top": "18mm", "bottom": "18mm", "left": "16mm", "right": "16mm"},
        )
        browser.close()
    print(f"PDF: {PDF_PATH} ({PDF_PATH.stat().st_size} bytes)")
    print("Images remain in diagrams/ as PNG files.")


if __name__ == "__main__":
    main()
