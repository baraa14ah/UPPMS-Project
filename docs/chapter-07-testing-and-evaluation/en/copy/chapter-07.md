# Chapter Seven: Testing and Evaluation

This chapter aims to prove that UPPMS works as required. It presents the test plan, types of tests, test diagrams, results and analysis, quality metrics, and user testing. Details are completed in Appendix C.

## 7-1 Test Plan

What / When / Tools / Who? (See Appendix C).

**Figure 7-1.** Test Plan Flow Diagram — `diagrams-en/01-test-plan-flow.png`

**Table 7-1.** Test Scope

| Item | Details |
|------|---------|
| What will be tested | Backend services, DB integration, API, isolation, XML, proposals, tracks, committees, genetic scheduling, SPU acceptance |
| What will not be fully tested here | Exhaustive multi-browser compatibility and large-scale production stress |
| When | Each Sprint, phase end, before delivery |
| Tools | PHPUnit 10, MySQL, React manual checks |
| Responsible | Dev team, supervisor, pilot users |

**Table 7-2.** Testing Responsibilities and Schedule

| Phase | Owner | Activity |
|-------|-------|----------|
| Sprint | Development team | Feature-related unit/system tests |
| Phase end | Development team | Full suite + regression |
| Before delivery | Team + pilots | Acceptance / user testing |

## 7-2 Types of Tests

Unit, Integration, System, Acceptance, Performance/Stress, Security, Usability, Compatibility, Regression.

**Table 7-3.** Types of Tests Applied in UPPMS

| Test Type | Purpose | Tool / Approach |
|-----------|---------|-----------------|
| Unit | Fitness/GA/Track/XML units | PHPUnit Unit (50) |
| Integration | Services + DB | Feature/Unit + Transactions |
| System | Full API flows | PHPUnit Feature (91) |
| Acceptance | Admin/Supervisor/Student | Manual + SpuCampusDemoSeeder |
| Performance/Stress | GA under denser load | Campus Demo GA runs |
| Security | Isolation/RBAC/XML | Feature + Middleware |
| Usability | UI clarity | User testing |
| Compatibility | Chrome/Edge, RTL/LTR | Manual |
| Regression | No breakage | phpunit |

**Figure 7-2.** UPPMS Test Pyramid — `diagrams-en/02-test-pyramid.png`

Total automated cases: **141** (Unit: 50 — Feature: 91).

## 7-3 Test Diagrams

**Figure 7-3.** Module Coverage — `diagrams-en/03-test-coverage-modules.png`

**Table 7-4.** Sample Test Cases

| Case ID | Description | Inputs | Expected Output |
|---------|-------------|--------|-----------------|
| TC-XML-01 | Matching student XML registration | email + number | active |
| TC-XML-02 | Matching supervisor XML registration | email only | active |
| TC-PROP-01 | Proposals without early track lock | up to 3 pending | no early track |
| TC-PROP-02 | Approve proposal | supervisor approve | project + track |
| TC-TRACK-01 | Prevent prerequisite skip | later stage | reject/lock |
| TC-GA-01 | Generate schedules | projects+availability+rooms | candidates + fitness |
| TC-COM-01 | Committee conflict | supervisor on own committee | reject |

**Figure 7-4.** Automated Test Distribution — `diagrams-en/04-results-summary.png`

## 7-4 Test Results and Analysis

**Table 7-5.** Inventory — Total 141, Unit 50, Feature 91, 20 files.

**Table 7-6.** Main files: ProjectProposal*, Track*, Xml*, Committee*, Genetic/Fitness/Evolutionary*, Schedule*, AI*.

Analysis: critical paths covered; failures fixed then regression; no critical isolation/security leftovers before delivery; execution time recorded from PHPUnit.

## 7-5 Quality Metrics

**Table 7-7.** Test Coverage, Defect Density, Pass Rate (≥95% target), Response Time, Error Rate, Security Isolation.

## 7-6 User Testing

SPU demo (`SpuCampusDemoSeeder`): 28 students, 10 supervisors, 28 projects, 4 committees. Password: `password`.

**Table 7-8.** Admin / Supervisor / Student demo accounts and scenarios.

**Table 7-9.** Feedback: early track lock (fixed), multi-uni supervisor visibility (fixed), demo data seeder.

---

# Appendix C — Test Plan Template (UPPMS)

## C-1 Scope / C-2 Strategy / C-3 Environment / C-4 Sample Cases
(See PDF/DOCX for full tables TC-01…TC-08.)
