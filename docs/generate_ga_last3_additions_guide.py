#!/usr/bin/env python3
"""Generate last-3 GA additions guide in the same academic style as
genetic-scheduling-improvements-guide (cover, abstract, TOC, serif RTL).
"""
from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
HTML_PATH = ROOT / "genetic-scheduling-last3-additions.html"
PDF_PATH = ROOT / "genetic-scheduling-last3-additions.pdf"

EDGE = [
    Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
]

HTML = r"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PMS — آخر 3 إضافات على خوارزمية الجدولة</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <style>
    @page { size: A4; margin: 25mm 20mm 22mm 20mm; }
    body {
      font-family: "Traditional Arabic", "Times New Roman", Times, serif;
      font-size: 14pt; line-height: 1.9; color: #000; margin: 0; padding: 0;
      background: #fff; text-align: justify;
    }
    .cover { page-break-after: always; text-align: center; padding: 90px 40px 60px; min-height: 85vh; }
    .cover .chapter-label { font-size: 13pt; letter-spacing: 1px; margin-bottom: 48px; color: #333; }
    .cover h1 { font-size: 21pt; font-weight: bold; line-height: 1.6; margin: 0 0 24px; border: none; padding: 0; }
    .cover .subtitle { font-size: 13pt; color: #333; margin-bottom: 80px; line-height: 1.8; }
    .cover .meta { font-size: 12pt; color: #444; border-top: 1px solid #000; display: inline-block; padding-top: 16px; margin-top: 24px; min-width: 300px; }
    .abstract { page-break-after: always; padding: 40px 0 20px; }
    .abstract h2 { font-size: 14pt; text-align: center; margin-bottom: 24px; font-weight: bold; }
    .abstract p { text-indent: 1.5em; margin: 0 0 12px; }
    .keywords { margin-top: 24px; font-size: 12pt; }
    .toc { page-break-after: always; padding: 20px 0; }
    .toc h2 { font-size: 14pt; text-align: center; margin-bottom: 28px; font-weight: bold; }
    .toc ol { line-height: 2.0; padding-right: 0; list-style: none; counter-reset: toc; font-size: 12.5pt; }
    .toc ol li { counter-increment: toc; padding: 2px 0; border-bottom: 1px dotted #999; }
    .toc ol li::before { content: counter(toc) ". "; font-weight: bold; }
    h2.section { font-size: 14pt; font-weight: bold; margin: 32px 0 16px; page-break-after: avoid; text-align: right; }
    h3 { font-size: 13pt; font-weight: bold; margin: 20px 0 10px; page-break-after: avoid; }
    p { margin: 0 0 12px; text-indent: 1.5em; }
    p.no-indent { text-indent: 0; }
    ul, ol { margin: 8px 0 16px; padding-right: 2em; }
    li { margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0 20px; font-size: 12pt; page-break-inside: avoid; direction: ltr; }
    th, td { border: 1px solid #000; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { font-weight: bold; background: #f5f5f5; }
    .table-caption, .figure-caption { font-size: 11pt; text-align: center; margin: -8px 0 20px; color: #333; direction: ltr; }
    .definition { margin: 16px 24px; padding: 12px 16px; border-right: 2px solid #000; background: #fafafa; text-indent: 0; }
    .definition strong { display: block; margin-bottom: 6px; }
    .note { margin: 16px 0; padding: 10px 14px; border: 1px solid #666; font-size: 12pt; text-indent: 0; }
    .update { margin: 16px 0; padding: 10px 14px; border: 1px solid #000; border-right: 4px solid #000; background: #f0f0f0; text-indent: 0; }
    .diagram { margin: 20px 0 8px; padding: 16px; border: 1px solid #999; page-break-inside: avoid; background: #fff; }
    .mermaid { direction: ltr; text-align: center; font-size: 11pt; }
    .conclusion { margin-top: 32px; padding-top: 16px; border-top: 1px solid #000; }
    .conclusion h2 { font-size: 14pt; text-align: center; margin-bottom: 16px; }
    footer { margin-top: 48px; padding-top: 12px; border-top: 1px solid #ccc; font-size: 10pt; text-align: center; color: #555; }
  </style>
</head>
<body>

<div class="cover">
  <div class="chapter-label">نظام إدارة مشاريع التخرج (PMS)</div>
  <h1>آخر ثلاث إضافات على محرك الجدولة الجينية<br/>كيف أُضيفت وكيف تؤثّر عملياً<br/>لياقة بالعقوبة · تهيئة ذكية · إصلاح التعارضات</h1>
  <p class="subtitle">
    دليل تفسيري — ما تغيّر في الخوارزمية بعد التحسينات الأخيرة<br/>
    يوليو 2026
  </p>
  <div class="meta">مكمل لدليل الإصدار 2.0 · الإضافات الثلاث مُنفَّذة في الكود</div>
</div>

<div class="abstract">
  <h2>الملخص</h2>
  <p>
    يوثّق هذا الدليل <strong>آخر ثلاث إضافات</strong> على خوارزمية الجدولة
    الجينية في نظام PMS فقط — دون وصف ميزات المنتج خارج المحرك. الإضافة الأولى
    هي <em>اللياقة بالعقوبة والترتيب المعجمي</em>: جداول المخالفات لم تعد
    تُصفَّر كلها إلى صفر واحد لا يميّز بينها. الإضافة الثانية هي
    <em>التهيئة الذكية</em>: المجتمع الأولي يبدأ بمزيج جشع ومتغيرات وعشوائي.
    الإضافة الثالثة هي <em>إصلاح التعارضات</em>: بعد كل تزاوج وطفرة تُصلَح
    حجوزات القاعة والأستاذ فوراً. يشرح الدليل كيف أُضيفت كل واحدة في مسار
    التشغيل، وكيف يستفيد المدير منها عند مراجعة أفضل ثلاثة مقترحات.
  </p>
  <p class="keywords no-indent">
    <strong>الكلمات المفتاحية:</strong>
    لياقة بالعقوبة، ترتيب معجمي، تهيئة ذكية، إصلاح التعارضات، خوارزمية جينية.
  </p>
</div>

<div class="toc">
  <h2>فهرس المحتويات</h2>
  <ol>
    <li>لماذا هذه الإضافات الثلاث؟</li>
    <li>نظرة مجمّعة على الثلاث معاً</li>
    <li>الإضافة الأولى: اللياقة بالعقوبة والترتيب المعجمي — الفكرة</li>
    <li>الإضافة الأولى: مثال عملي على الاستفادة من الجداول المخالفة</li>
    <li>الإضافة الثانية: التهيئة الذكية — الفكرة</li>
    <li>الإضافة الثانية: مثال عملي خطوة بخطوة</li>
    <li>الإضافة الثالثة: إصلاح التعارضات — الفكرة</li>
    <li>الإضافة الثالثة: مثال عملي خطوة بخطوة</li>
    <li>كيف تعمل الإضافات الثلاث معاً</li>
    <li>مقارنة شاملة: قبل وبعد</li>
    <li>الخلاصة</li>
  </ol>
</div>

<div class="body">

<h2 class="section">1. لماذا هذه الإضافات الثلاث؟</h2>
<p>
  المحرك الأساسي كان قادراً على توليد جداول، لكن ثلاثة ثغرات ظهرت في
  الاستخدام الفعلي:
</p>
<ul>
  <li><strong>فخ الأصفار:</strong> أي جدول فيه مخالفة صارمة درجته صفر — جدول بمخالفة واحدة وجدول بعشر مخالفات يبدوان متساويين عند الاختيار.</li>
  <li><strong>بداية عشوائية:</strong> المجتمع الأولي كله عشوائي، فيبدأ الجيل الأول بتعارضات كثيرة تستهلك مهلة التشغيل.</li>
  <li><strong>اكتشاف متأخر للتعارض:</strong> التزاوج والطفرة قد يُنشئان تعارضاً دون إصلاحه قبل التقييم.</li>
</ul>

<div class="update">
  <strong>حالة التنفيذ:</strong> الإضافات الثلاث <em>مُفعَّلة الآن</em> في
  <span style="font-family: Times New Roman, serif; direction: ltr;">GeneticSchedulerService</span>
  ومكوّنات الجدولة المرتبطة. هذا الدليل يصف السلوك الحالي للمحرك.
</div>

<table>
  <tr><th>Gap before</th><th>Addition</th><th>Where it acts</th></tr>
  <tr><td>Zero-trap ranking</td><td>Penalty fitness + lexicographic compare</td><td>Every evaluation / selection / top-3</td></tr>
  <tr><td>100% random start</td><td>Smart initialization</td><td>Once — population build</td></tr>
  <tr><td>Conflicts only found at evaluation</td><td>Repair operator</td><td>After init and after each offspring</td></tr>
</table>
<p class="table-caption">Table 1: The three algorithm additions and where they act</p>

<h2 class="section">2. نظرة مجمّعة على الثلاث معاً</h2>

<div class="diagram">
<pre class="mermaid">
flowchart LR
  subgraph A1["Addition 1"]
    F[Penalty fitness] --> C[Lexicographic rank]
  end
  subgraph A2["Addition 2"]
    I[Smart init mix]
  end
  subgraph A3["Addition 3"]
    R[Repair rooms + faculty]
  end
  A2 --> Loop[GA generations]
  A3 --> Loop
  Loop --> A1
  A1 --> Top[Top 3 candidates]
</pre>
</div>
<p class="figure-caption">Figure 1: How the three additions connect in the engine</p>

<table>
  <tr><th>#</th><th>Addition</th><th>Code focus</th><th>Effect for admin</th></tr>
  <tr><td>1</td><td>Penalty + lex rank</td><td>FitnessCalculator / Chromosome.compare</td><td>#1 is cleanest by hard violations, then score</td></tr>
  <tr><td>2</td><td>Smart init</td><td>PopulationManager.initialize</td><td>Faster reach to valid schedules</td></tr>
  <tr><td>3</td><td>Repair</td><td>EvolutionaryOperators.repair</td><td>Fewer hard conflicts each generation</td></tr>
</table>
<p class="table-caption">Table 2: Summary of the three additions</p>

<h2 class="section">3. الإضافة الأولى: اللياقة بالعقوبة والترتيب المعجمي — الفكرة</h2>

<div class="definition">
  <strong>تعريف: اللياقة بالعقوبة + الترتيب المعجمي</strong>
  تُحسب الدرجات الناعمة دائماً، ثم تُطرح عقوبة ثابتة لكل مخالفة صارمة
  (5000 نقطة). للترتيب بين الجداول: (1) أقل عدد مخالفات صارمة أولاً، ثم
  (2) أعلى درجة ناعمة. لا يُعامل كل جدول مخالف كـ «صفر لا يُميَّز».
</div>

<p>
  بدون هذه الإضافة، الجداول المخالفة كلها تظهر بدرجة صفر، فيختار الاختيار
  بالبطولة أحياناً جدولاً بسبع مخالفات كأبٍ جيد — ولا يوجد اتجاه واضح نحو
  تقليل المخالفات.
</p>

<table>
  <tr><th>Schedule</th><th>Hard violations</th><th>Soft score</th><th>Displayed / ordered result</th></tr>
  <tr><td>A</td><td>7</td><td>900</td><td>Ranked last — most violations</td></tr>
  <tr><td>B</td><td>3</td><td>850</td><td>Better than A despite soft total</td></tr>
  <tr><td>C</td><td>1</td><td>780</td><td>Enters elite — near-valid</td></tr>
  <tr><td>D</td><td>0</td><td>620</td><td>Rank 1 among valid if highest soft among zeros</td></tr>
</table>
<p class="table-caption">Table 3: Lexicographic order prefers fewer hard violations first</p>

<div class="diagram">
<pre class="mermaid">
flowchart TB
  subgraph Before["Before — zero trap"]
    B1["7 hard → score 0"]
    B2["1 hard → score 0"]
    B3["0 hard → score 785"]
  end
  subgraph After["After — lex order"]
    A1["0 hard / 785 → rank 1"]
    A2["1 hard / 0 → rank 2"]
    A3["7 hard / 0 → rank 4"]
  end
  CMP["compare: hard ASC then fitness DESC"]
  Before --> CMP --> After
</pre>
</div>
<p class="figure-caption">Figure 2: Before vs after ranking with penalty fitness</p>

<h2 class="section">4. الإضافة الأولى: مثال عملي على الاستفادة من الجداول المخالفة</h2>
<p>
  في الجيل الأول، يظهر جدول بمخالفة واحدة ودرجة ناعمة عالية. لن يُعرض للمدير
  كمقترح أول إن وُجد أفضل، لكنه <strong>يبقى في النخبة ويتكاثر</strong> —
  فيورّث توزيعاً قريباً من الصحيح لأبنائه. خلال الأجيال اللاحقة ينخفض عدد
  المخالفات في المجتمع كله، وتنتهي الشاشة بثلاثة مقترحات مُرتَّبة: الأفضل
  أولاً (صفراً مخالفات إن أمكن).
</p>

<div class="note">
  <strong>الفائدة للمدير:</strong> «عدم التصفير» لا يعني اعتماد جدول مخالف.
  يعني أن المحرك يستفيد من الجداول شبه الصحيحة أثناء التطور حتى يصل
  المقترح رقم 1 إلى جدول أنظف.
</div>

<h2 class="section">5. الإضافة الثانية: التهيئة الذكية — الفكرة</h2>

<div class="definition">
  <strong>تعريف: التهيئة الذكية (Smart Initialization)</strong>
  بدلاً من مئة جدول عشوائي بالكامل، يبني المحرك المجتمع من: جداول جشعة
  تتجنب تعارض القاعة والأستاذ، متغيرات خفيفة عليها، ثم عشوائي للحفاظ على
  التنوع.
</div>

<table>
  <tr><th>Population slice</th><th>Share of 100</th><th>Method</th></tr>
  <tr><td>Greedy seeds</td><td>~20%</td><td>Conflict-aware first-free slot / room pass</td></tr>
  <tr><td>Light variants</td><td>~30%</td><td>Small tweaks of the greedy seed</td></tr>
  <tr><td>Random</td><td>~50%</td><td>Full random — preserves search diversity</td></tr>
</table>
<p class="table-caption">Table 4: Implemented population mix</p>

<div class="diagram">
<pre class="mermaid">
flowchart TB
  Start([initialize N]) --> Split{Mix}
  Split -->|~20%| G[greedy]
  Split -->|~30%| V[light variants]
  Split -->|~50%| R[random]
  G --> Pop[population]
  V --> Pop
  R --> Pop
  Pop --> Fix[repair then first evaluation]
</pre>
</div>
<p class="figure-caption">Figure 3: Smart initialization mix</p>

<h2 class="section">6. الإضافة الثانية: مثال عملي خطوة بخطوة</h2>
<p class="no-indent">
  <strong>السياق:</strong> 5 مشاريع، قاعتان A و B، فتحتان: السبت 10:00
  و 11:00، لجنة مشتركة.
</p>

<h3>6.1 بدون تهيئة ذكية</h3>
<table>
  <tr><th>Project</th><th>Random slot</th><th>Room</th><th>Conflict?</th></tr>
  <tr><td>P1</td><td>Sat 10:00</td><td>A</td><td>—</td></tr>
  <tr><td>P2</td><td>Sat 10:00</td><td>A</td><td>Room A double-booked</td></tr>
  <tr><td>P3</td><td>Sat 10:00</td><td>B</td><td>Committee double-booked</td></tr>
  <tr><td>P4</td><td>Sat 11:00</td><td>A</td><td>—</td></tr>
  <tr><td>P5</td><td>Sat 10:00</td><td>B</td><td>Committee double-booked</td></tr>
</table>
<p class="table-caption">Table 5: Random init — several hard conflicts from generation 0</p>

<h3>6.2 مع التهيئة الذكية</h3>
<table>
  <tr><th>Step</th><th>Project</th><th>Chosen slot</th><th>Room</th><th>Reason</th></tr>
  <tr><td>1</td><td>P1</td><td>Sat 10:00</td><td>A</td><td>First free combination</td></tr>
  <tr><td>2</td><td>P2</td><td>Sat 10:00</td><td>B</td><td>Room A taken; committee still free</td></tr>
  <tr><td>3</td><td>P3</td><td>Sat 11:00</td><td>A</td><td>Committee busy at 10:00</td></tr>
  <tr><td>4</td><td>P4</td><td>Sat 11:00</td><td>B</td><td>Remaining free combo</td></tr>
  <tr><td>5</td><td>P5</td><td>—</td><td>—</td><td>Capacity gap flagged early</td></tr>
</table>
<p class="table-caption">Table 6: Greedy init — conflicts among schedulable sessions minimized</p>

<div class="update">
  <strong>الأثر:</strong> الجيل الأول يبدأ بعدد مخالفات أقل، فالمقترحات النهائية
  تصل أسرع إلى صفر مخالفات ضمن مهلة الثلاثين ثانية.
</div>

<h2 class="section">7. الإضافة الثالثة: إصلاح التعارضات — الفكرة</h2>

<div class="definition">
  <strong>تعريف: إصلاح التعارضات (Repair Operator)</strong>
  خطوة تُنفَّذ بعد التهيئة وبعد كل تزاوج وطفرة: إن وُجدت قاعة مزدوجة تُنقل
  الجلسة لقاعة فارغة؛ وإن وُجد عضو لجنة محجوز مرتين تُنقل الجلسة لأقرب فتحة
  مشتركة متاحة. ما تعذّر إصلاحه يبقى ليُعاقَب في اللياقة.
</div>

<table>
  <tr><th>Stage</th><th>Without repair</th><th>With repair</th></tr>
  <tr><td>After crossover</td><td>Child may keep room / faculty clashes</td><td>Repair tries to clear clashes immediately</td></tr>
  <tr><td>After mutation</td><td>Random room/slot may double-book</td><td>Next free room/slot preferred</td></tr>
  <tr><td>Evaluation</td><td>Heavy penalties</td><td>Fewer penalties; soft scores matter more</td></tr>
</table>
<p class="table-caption">Table 7: Repair effect inside each generation</p>

<div class="diagram">
<pre class="mermaid">
flowchart LR
  XO[Crossover] --> MU[Mutation]
  MU --> REP[Repair]
  REP --> RR[Fix room clash]
  REP --> RF[Fix faculty clash]
  RR --> Fit[Fitness]
  RF --> Fit
</pre>
</div>
<p class="figure-caption">Figure 4: Repair after crossover and mutation</p>

<h2 class="section">8. الإضافة الثالثة: مثال عملي خطوة بخطوة</h2>
<p>
  بعد تزاوج، يظهر د. سامر في جلستين بنفس الوقت:
</p>

<table>
  <tr><th>Project</th><th>Time</th><th>Room</th><th>Dr. Samer</th></tr>
  <tr><td>P2</td><td>Sat 10:00</td><td>A</td><td>Yes</td></tr>
  <tr><td>P7</td><td>Sat 10:00</td><td>B</td><td>Yes — CONFLICT</td></tr>
  <tr><td>P9</td><td>Sat 11:00</td><td>A</td><td>No</td></tr>
</table>
<p class="table-caption">Table 8: Conflict after crossover</p>

<p>
  الإصلاح ينقل P7 إلى السبت 11:00 القاعة B إن كانت متاحة. يُقيَّم الجدول
  بعدها بصفر مخالفات صارمة على هذا التعارض — بدل انتظار عدة أجيال.
</p>

<table>
  <tr><th>Project</th><th>After repair</th><th>Room</th><th>Result</th></tr>
  <tr><td>P2</td><td>Sat 10:00</td><td>A</td><td>0</td></tr>
  <tr><td>P7</td><td>Sat 11:00</td><td>B</td><td>Fixed</td></tr>
  <tr><td>P9</td><td>Sat 11:00</td><td>A</td><td>0</td></tr>
</table>
<p class="table-caption">Table 9: Same schedule after repair</p>

<div class="diagram">
<pre class="mermaid">
sequenceDiagram
  participant Op as Crossover
  participant Rep as Repair
  participant Fit as Fitness
  Op->>Rep: Child with faculty double-booking
  Rep->>Rep: Move P7 to Sat 11:00 Room B
  Rep->>Fit: Cleaner schedule
  Fit-->>Op: Higher rank — kept as elite/parent
</pre>
</div>
<p class="figure-caption">Figure 5: Repair resolves one conflict before evaluation</p>

<h2 class="section">9. كيف تعمل الإضافات الثلاث معاً</h2>
<p>
  الثلاث مكمّلات: التهيئة تحسّن نقطة الانطلاق، الإصلاح ينظّف كل جيل، والعقوبة
  مع الترتيب المعجمي يضمنان أن الأفضل يصل إلى الشاشة أولاً.
</p>

<table>
  <tr><th>Addition</th><th>When</th><th>What it solves</th></tr>
  <tr><td>Smart init</td><td>Once at start</td><td>Bad random starting point</td></tr>
  <tr><td>Repair</td><td>Each child + initial pass</td><td>New room/faculty clashes</td></tr>
  <tr><td>Penalty + lex rank</td><td>Every compare / top-3</td><td>Direction and fair ranking</td></tr>
</table>
<p class="table-caption">Table 10: Complementary roles</p>

<div class="diagram">
<pre class="mermaid">
sequenceDiagram
  participant S as GeneticSchedulerService
  participant PM as PopulationManager
  participant EO as EvolutionaryOperators
  participant FC as FitnessCalculator
  S->>PM: initialize smart mix
  loop each chromosome
    S->>EO: repair initial
  end
  S->>FC: evaluatePopulation
  loop generations
    S->>EO: select + crossover + mutate + repair
    S->>FC: evaluate offspring
    S->>PM: replaceWorst via lex compare
  end
  S->>PM: selectDistinctTop 3
</pre>
</div>
<p class="figure-caption">Figure 6: Full pipeline with the three additions</p>

<div class="update">
  <strong>ما يراه المدير:</strong> نفس واجهة «ثلاثة مقترحات» — لكن الانطلاق
  أذكى، الإصلاح أسرع، والترتيب أوضح. المقترح رقم 1 هو الأنظف مخالفات ثم
  الأعلى درجة.
</div>

<h2 class="section">10. مقارنة شاملة: قبل وبعد</h2>

<table>
  <tr><th>Metric</th><th>Before the three</th><th>After the three</th></tr>
  <tr><td>Generation-0 conflicts</td><td>High (random only)</td><td>Lower (greedy + repair)</td></tr>
  <tr><td>Selection direction</td><td>Weak among invalid (all zeros)</td><td>Clear (fewer hard first)</td></tr>
  <tr><td>Child quality per generation</td><td>Many inherited clashes</td><td>Many clashes repaired instantly</td></tr>
  <tr><td>Top-3 presentation</td><td>May look tied / noisy</td><td>Ordered by hard then soft</td></tr>
  <tr><td>Admin re-runs</td><td>More often under tight capacity</td><td>Less often</td></tr>
</table>
<p class="table-caption">Table 11: Before/after comparison</p>

<div class="diagram">
<pre class="mermaid">
flowchart LR
  subgraph OLD["Before"]
    O1[Random start] --> O2[Zero trap]
    O2 --> O3[Slow clean-up]
  end
  subgraph NEW["After"]
    N1[Smart start] --> N2[Repair each gen]
    N2 --> N3[Penalty + lex top 3]
  end
</pre>
</div>
<p class="figure-caption">Figure 7: Overall improvement path</p>

<div class="conclusion">
  <h2>11. الخلاصة</h2>
  <p>
    <strong>الإضافة الأولى</strong> تجعل المخالفات قابلة للترتيب فلا يضيع
    اتجاه البحث. <strong>الإضافة الثانية</strong> تمنح انطلاقة أقرب لجدول
    صالح. <strong>الإضافة الثالثة</strong> تصلح أخطاء التوالد فوراً بدل انتظار
    الأجيال. معاً: المحرك يبدأ أذكى، يصلح أسرع، ويرتّب أوضح — حتى يصل المدير
    إلى ثلاثة مقترحات جاهزة للاعتماد. هذا الدليل يخص إضافات الخوارزمية فقط،
    وليس ميزات المسارات أو اللجان أو المقترحات كمنتج مستقل.
  </p>
</div>

</div>

<footer>
  نظام إدارة مشاريع التخرج — آخر ثلاث إضافات على خوارزمية الجدولة · يوليو 2026
</footer>

<script>
  mermaid.initialize({
    startOnLoad: true,
    theme: "neutral",
    themeVariables: {
      fontFamily: "Times New Roman, Traditional Arabic, serif",
      fontSize: "12px"
    },
    flowchart: { curve: "linear", padding: 12 },
    sequence: { actorMargin: 40, messageMargin: 28 }
  });
</script>
</body>
</html>
"""


def find_edge() -> Path | None:
    for p in EDGE:
        if p.exists():
            return p
    return None


def write_html() -> None:
    HTML_PATH.write_text(HTML, encoding="utf-8")
    print(f"HTML: {HTML_PATH}")


def write_pdf_playwright() -> bool:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return False

    uri = HTML_PATH.resolve().as_uri()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(uri, wait_until="networkidle")
        page.wait_for_timeout(3000)
        page.pdf(
            path=str(PDF_PATH),
            format="A4",
            print_background=True,
            margin={
                "top": "25mm",
                "bottom": "22mm",
                "left": "20mm",
                "right": "20mm",
            },
        )
        browser.close()
    return PDF_PATH.exists()


def write_pdf_edge() -> bool:
    edge = find_edge()
    if not edge:
        return False
    uri = HTML_PATH.resolve().as_uri()
    # Give Chromium/Edge time to fetch Mermaid and render.
    cmd = [
        str(edge),
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        "--virtual-time-budget=10000",
        f"--print-to-pdf={PDF_PATH}",
        uri,
    ]
    subprocess.run(cmd, check=False)
    time.sleep(1)
    return PDF_PATH.exists()


def write_pdf() -> None:
    if write_pdf_playwright() or write_pdf_edge():
        print(f"PDF: {PDF_PATH} ({PDF_PATH.stat().st_size} bytes)")
        return
    print("PDF export failed.", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    write_html()
    write_pdf()


if __name__ == "__main__":
    main()
