# IMS — Institute Management System

Professional multi-portal institute management for schools, colleges, universities, academies and coaching centers.

**Primary market:** Pakistan · Multi-language (EN + UR) · Country packs ready

## Run

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Requires **PostgreSQL** running locally. Connection is in `.env`:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/ims?schema=public"
```

Useful DB commands:

| Command | Purpose |
|---------|---------|
| `npm run db:push` | Sync Prisma schema → Postgres |
| `npm run db:seed` | Load all demo / Super Admin data |
| `npm run db:studio` | Browse tables in Prisma Studio |
| `npm run db:reset` | Wipe + reseed |

Open http://localhost:3000/login — click a **role card** to enter that portal.

| Portal | Email | Password |
|--------|-------|----------|
| **Super Admin** | super@ims.cloud | super123 |
| Admin | admin@ims.edu.pk | admin123 |
| Teacher | teacher@ims.edu.pk | teach123 |
| Accountant | accounts@ims.edu.pk | fees123 |
| Parent | parent@ims.edu.pk | parent123 |
| Student | student@ims.edu.pk | stu123 |

School self-registration: http://localhost:3000/register-school

### Super Admin (platform head)
- Command Center — schools, MRR, students, pending approvals
- Schools — create / edit / suspend / activate / open as support
- Registrations — approve or reject institute applications
- Plans & Packages — seats, campuses, module bundles, pricing
- Billing — invoices, mark paid, restore suspended tenants
- Module Access — per-school overrides + student/staff limits
- Platform Users — owner / support / sales / billing staff
- Audit Log — every platform action
- Platform Settings — registration policy, gateways, trial defaults

If numbers look stale after updates: **Settings → Reset demo data** (school) or **Platform Settings → Reset demo platform** (Super Admin).

## Deep module coverage

### Admin
- **Dashboard** — live KPIs (month fee, overdue, today attendance %, exam avg)
- **Admissions** — pipeline, checklist, address/previous school, enroll wizard (class/section/DOB/gender + fee structure challan)
- **Students** — CRUD, profile detail, ID card + report card links
- **Academics** — classes/subjects/timetable, live strength, capacity warnings; teacher/room/class clash detection; printable weekly grid
- **Attendance** — student mark sheet (period + holiday + remarks) + staff attendance; history % (leave excluded from denominator)
- **Exams** — schedule, publish/unpublish to portals, class marks sheet, ranks, printable report cards
- **Fees** — structures, fee heads, mass class challans, waive, defaulters filter, payment mode, discount, late fee, collect → voucher
- **Accounts** — vouchers, expenses, trips, payroll; date/campus filters; CSV packs; fee↔ledger reconciliation
- **Staff** — directory, bank payout fields, leaves (inclusive days; unpaid → payroll), payroll (editable lines, leave deduct, payslips), attendance snapshot
- **Library** — catalog edit/delete, issue to student/staff by id, renew +14d, overdue Rs 10/day, fine→fee by memberId
- **Transport** — routes (edit/status), student assignment sync, monthly fee generation (active routes / optional route scope)
- **Hostel** — rooms (maintenance), allot/vacate, editable mess fee, monthly mess batch challans, visitor log (boarders)
- **Inventory** — stock value, low-stock filter, preferred vendor, multi-line POs (receive/cancel), purchase/issue with stock guard
- **Communication** — notice templates, class/section + fee filters, draft/send via `/api/notify` (sandbox/live), delivery log
- **Reports** — CSV packs: students, fees, attendance, results, staff, payroll, ledger, expenses, trips, reconcile, transport, hostel, library, admissions, inventory
- **Settings** — institute, campuses, country pack, **late-fee policy**

### Printables
- `/challan/[id]` — fee challan (base/discount/late/net)
- `/report-card/[studentId]` — subject results + overall
- `/id-card/[studentId]` — student ID card
- `/payslip/[id]` — salary payslip (earnings, tax, unpaid leave, bank)

### Portals
- Teacher: classes, attendance, marks, timetable, report card links, homework review and grading
- Accountant: collection desk, challans, vouchers, fee reports
- Parent: child fees/attendance/results/notices + report/ID card
- Student: timetable, homework submission and returned feedback, results, fees, notices + cards

## Math engine (`src/lib/calc`)
- Fee net = base − discount + late fee
- Attendance % = (present+late)/(present+late+absent)
- Exam grade bands + pass ≥ 40% + ranks
- Payroll net = basic + allowances − (tax + unpaid-leave + extras); unpaid leave = basic/30 × days
- Library fine = overdue days × 10

## Stack
Next.js 16 · TypeScript · Tailwind 4 · **PostgreSQL + Prisma** (platform + school data)

School operational modules still run through a client DataProvider that **loads/saves from Postgres** via `/api/school-data`. Super Admin data uses `/api/platform`.

## Security (Phase 1)
- Passwords stored **bcrypt-hashed** in PostgreSQL
- Sessions in **HTTP-only signed cookies** (`SESSION_SECRET` in `.env`)
- **Middleware** protects all portal routes — unauthenticated users redirect to `/login`
- **API authorization** — every route checks session, role, tenant, and platform permissions
- **Tenant isolation** — each account tied to one school (`tenantId` on `AuthAccount`)
- **Platform RBAC** — Super Admin staff permissions enforced on platform APIs
- **Suspend/expired** schools blocked at login and on all school-data API calls

## Super Admin Phase 2
- **Onboarding** — approve/create school → auto-provision admin AuthAccount + show credentials once
- **Billing sweep** — mark overdue, auto-suspend after 14 days, expire trials, issue renewal invoices
- **Plan enforcement** — student/staff seat limits enforced on `/api/school-data` PUT
- **Impersonation audit** — enter/exit support mode logged to platform audit (PostgreSQL)
- **Analytics** — plan mix, status mix, top MRR, seat utilization on Command Center
- **Bulk ops** — multi-select suspend/activate + CSV export on Schools page

## School Admin Phase 3
- **Users & RBAC** — create system users with module checkboxes + provision portal login (password shown once)
- **Module ACL** — Sidebar + `ModuleGate` block direct URL access for restricted modules
- **Document uploads** — files saved under `/public/uploads/{tenantId}/` via `/api/uploads` (5MB)
- **CSV import** — Settings → Import for students & staff (template download included)
- **Reports** — CSV exports for students, attendance, results, staff, fees ledger, payroll
- **Academic year rollover** — promote Grade/Class numbers, graduate Class 12, optional clear attendance
- **Backup / restore** — download workspace JSON and restore from Settings → Backup
- **School audit log** — filter + CSV export; actions logged for users, students, imports, rollover, restore

### School Admin depth (ops)
- **Fees** — fee heads, mass class challan generation, waive, defaulters view, payment mode on collect
- **Attendance** — period-wise student marks, holiday flag, remarks; staff attendance register
- **Exams** — publish/unpublish gates Parent/Student portals; class marks sheet (bulk upsert)
- **Academics** — teacher + room + class clash banners; printable weekly timetable grid
- **Staff payroll** — unpaid leave → basic/30 deduction; editable allowances/deductions before pay; bank fields; printable payslips; generate skips already-paid lines
- **Admissions enroll** — class catalog picker, section/gender/DOB on application; enroll modal confirms fee structure (no hardcoded 15k); optional challan skip
- **Communication** — audience class/section + pending/overdue fee filters; send posts through notify gateway; delivery log shows sandbox/live/fail
- **Library** — member id picker (student/staff), renew, book edit/delete, fine posting by memberId
- **Transport** — edit route + active/inactive; assign active-only; fee generate modal with preview & route filter
- **Hostel** — mess batch billing (month/room scope); allot guards; room maintenance; inline mess fee edit
- **Inventory** — multi-line purchase orders, vendor hints, low/out filter, min-stock edit, issue blocked when empty
- **Reports packs** — transport riders, hostel boarders, library issues/fines, admissions funnel, inventory stock, richer payroll CSV
- **Accounts polish** — date/campus filters; ledger/expenses/trips/payroll/reconcile CSV; fee collected vs fee receipts gap; unposted expenses & unsettled trips

## Role Portals Phase 4
- **Teacher** — classes, timetable, attendance, marks, homework assignments, student submission review/grading, leave, notices (staff-scoped)
- **Accountant** — fee collection, challans, payroll, expenses, vouchers, reports with ledger/reconcile CSV packs
- **Parent** — child switcher, fee pay (JazzCash/Easypaisa/card demo), attendance calendar, results, homework, notices
- **Student** — timetable grid, homework answer/file submission, returned grades and feedback, results by exam, fees, attendance calendar, notices
- **Principal** — school pulse, leave + admission approvals, staff directory, high-level reports
- **Librarian** — catalog, issue/return, overdue fines (Rs 10/day) + post fine as fee
- **Receptionist** — admission inquiries, visitor log, student lookup
- Demo logins: `principal@` / `prin123`, `library@` / `lib123`, `reception@` / `recv123`

## Integrations Phase 5
- **Payments** — `/api/payments/initiate|confirm|webhook/[gateway]` for JazzCash, Easypaisa, card (sandbox by default)
- **Notify** — `/api/notify/send` for SMS (Twilio), email (SMTP webhook), WhatsApp Cloud API
- **Parent pay** — Parent Portal calls payment APIs then posts fee ledger + optional receipt notify
- **Communication send** — SMS/WhatsApp/email notices also hit notify gateway (sandbox when keys missing)
- **PWA** — `manifest.json` + service worker; teacher attendance queues offline and syncs via `/api/attendance/sync`
- **Device attendance** — `/api/attendance/device` biometric/RFID/QR hook (`ATTENDANCE_DEVICE_KEY`)
- **Urdu** — portal dictionary keys + language switcher on portal shells
- **Mobile** — tighter padding, scrollable tables, compact logout on small screens
- **Settings** — Super Admin shows live env rail status (sandbox vs configured)
- Keys documented in `.env.example` (`INTEGRATIONS_SANDBOX`, JazzCash, Easypaisa, Twilio, SMTP, WhatsApp)

## Testing & Launch Phase 6
- **Unit tests** — Vitest suite for calc (incl. fee↔ledger reconcile), fees, auth RBAC, tenant isolation, billing, CSV import, integrations config
- **Run tests** — `npm test` (watch: `npm run test:watch`)
- **UAT checklist** — [`docs/UAT-CHECKLIST.md`](docs/UAT-CHECKLIST.md) manual sign-off before go-live (includes accounts reconcile)
- **Deployment** — [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) env vars, build, backup, Nginx, security hardening
- **CI gate** — `npm test` + `npx tsc --noEmit` + `npm run build` before release
- **Accountant parity** — portal reports share `exportCsv` + fee↔ledger gap with Admin Accounts
