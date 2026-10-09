# IMS Full Test Pass — Bug Log

**Date:** 2026-10-06  
**Method:** `tsc` + Vitest + route smoke (`scripts/smoke-routes.mjs`) + browser module walk + API probes.  
**Rule:** Log all defects during the pass; fix only after testing completes.

## Status legend
- `OPEN` / `FIXED` / `WONTFIX` / `PASS`

---

## A. Automated gate

| Check | Result | Notes |
|-------|--------|-------|
| `npx tsc --noEmit` | PASS | exit 0 (before + after fixes) |
| `npm test` | PASS | 56 tests |
| Route smoke (all portals) | PASS | All listed routes HTTP 200 after login |
| Unauth `/dashboard` | PASS | Redirects to `/login?from=%2Fdashboard` |
| Printables (`/challan/f1`, `/report-card/s1`, `/id-card/s1`, `/payslip/pr1`) | PASS | Correct content markers |
| `/api/notify/send` sandbox | PASS | `{ ok:true, sandbox:true }` |
| Prior `npm run build` | PASS | exit 0 (earlier this session) |

---

## B. Bugs found

### BUG-001 — Demo Growth plan blocks Hostel & Inventory
- **Severity:** major
- **Module:** Hostel, Inventory, Sidebar, ModuleGate
- **Repro:** Admin → `/hostel` or `/inventory`
- **Expected:** Demo school can use Hostel + Inventory
- **Actual:** “Access restricted”; sidebar omitted both
- **Fix:** Added `hostel` + `inventory` to `GROWTH_MODULE_IDS`; updated Growth plan description; applied DB update via `scripts/fix-growth-modules.ts`
- **Status:** FIXED (verified: sidebar shows Hostel/Inventory; `/hostel` renders; access API includes both)

### BUG-002 — React hydration warning on Login page
- **Severity:** minor
- **Module:** Login
- **Repro:** Open `/login`; Next.js issues badge may show hydration mismatch at brand label
- **Expected:** No hydration warning
- **Actual:** Dev overlay referenced `dict.brand.name` / tagline
- **Fix:** `suppressHydrationWarning` on login brand name/tagline nodes (locale can differ after client mount)
- **Status:** FIXED (mitigated)

### BUG-003 — Dashboard student count vs workspace student rows
- **Severity:** minor
- **Module:** Dashboard
- **Repro:** KPI showed 4 while workspace had 5 student rows
- **Expected:** Clear that KPI is active-only
- **Actual:** `stats.totalStudents` filters `status === "active"` (correct math, unclear label)
- **Fix:** Dashboard StatCard label → **Active students**
- **Status:** FIXED

---

## C. Module smoke matrix

| # | Area | Route / action | Result | Notes |
|---|------|----------------|--------|-------|
| 1 | Login | `/login` | PASS | BUG-002 mitigated |
| 2 | Auth gate | unauth `/dashboard` | PASS | |
| 3 | Admin dashboard | `/dashboard` | PASS | Active students label |
| 4–13 | Admissions → Transport | various | PASS | |
| 14 | Hostel | `/hostel` | PASS | after BUG-001 fix |
| 15 | Inventory | `/inventory` | PASS | after BUG-001 fix |
| 16–18 | Communication, Reports, Settings | | PASS | |
| 19–26 | All role portals + Super Admin | | PASS | HTTP 200 smoke |
| 27–30 | Printables | | PASS | real seed ids |
| 31 | Notify API | | PASS | sandbox |

---

## D. Fix summary

| Bug | Change |
|-----|--------|
| BUG-001 | `src/lib/platform/modules.ts` + seed description + DB plan modules |
| BUG-002 | `src/app/login/page.tsx` suppressHydrationWarning on brand |
| BUG-003 | `src/app/(app)/dashboard/page.tsx` label “Active students” |

**Artifacts**
- Bug log: `docs/TEST-BUG-LOG.md`
- Route smoke helper: `scripts/smoke-routes.mjs`
- One-shot plan fix: `scripts/fix-growth-modules.ts`

**Your manual UAT next:** follow `docs/UAT-CHECKLIST.md` with demo logins (Hostel/Inventory now visible under Campus Services).
