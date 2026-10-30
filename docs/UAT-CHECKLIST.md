# IMS User Acceptance Test (UAT) Checklist

Manual walkthrough before go-live. Check each box when verified.

## Authentication & security

- [ ] Unauthenticated user visiting `/dashboard` redirects to `/login`
- [ ] Wrong portal user cannot open another portal URL (e.g. teacher → `/accountant`)
- [ ] Logout clears session; back button does not restore access
- [ ] Suspended school blocked at login with clear message
- [ ] Super Admin impersonation logs enter/exit in Audit log

## Super Admin

- [ ] Command Center shows school counts, MRR, charts
- [ ] Approve registration → admin credentials modal (once)
- [ ] Suspend / activate school
- [ ] Billing sweep: overdue invoices, auto-suspend
- [ ] Plan modules toggle affects school portal access
- [ ] Integration status panel shows sandbox/live rails

## School Admin

- [ ] Dashboard stats match student/fee counts
- [ ] Add student → appears in list and class strength
- [ ] CSV import students (Settings → Import)
- [ ] Create system user + portal login
- [ ] Module ACL: restricted user blocked from direct module URL
- [ ] Academic year rollover promotes classes
- [ ] Backup download + restore (test on copy)
- [ ] School audit log records key actions

## Finance

- [ ] Generate fee challan → print challan page
- [ ] Collect fee (accountant) → voucher posted
- [ ] Parent online pay (sandbox) → fee balance updates
- [ ] Payroll run → payslip values sensible
- [ ] Reports CSV export downloads
- [ ] Accounts reconcile: fee collected vs Student Fee Income receipts (gap KPI)
- [ ] Accountant portal reports: fees / ledger / expenses / trips / payroll / reconcile CSVs
- [ ] Accounts date + campus filters scope ledger and expense lists

## Academics & operations

- [ ] Mark attendance (admin + teacher scoped classes)
- [ ] Enter exam marks → report card print
- [ ] Teacher assigns homework with a due date and optional points
- [ ] Student submits an answer and PDF/image before the due date
- [ ] Teacher can download the submission and return a score/feedback
- [ ] Student sees the returned grade/feedback; another student's attachment is inaccessible
- [ ] Student cannot edit assignment details or alter grades through the school-data API
- [ ] Send notice (SMS/email sandbox) → delivery log entries
- [ ] Library issue/return + overdue fine
- [ ] Transport/hostel pages load for enabled plans

## Role portals

| Portal | Login | Key flows |
|--------|-------|-----------|
| Teacher | `teacher@ims.edu.pk` / `teach123` | Classes, attendance, homework, leave |
| Accountant | `accounts@ims.edu.pk` / `fees123` | Fee collection, challans, reports |
| Parent | `parent@ims.edu.pk` / `parent123` | Child switcher, fees, attendance, pay |
| Student | `student@ims.edu.pk` / `stu123` | Timetable, homework, results |
| Principal | `principal@ims.edu.pk` / `prin123` | Approvals, staff, reports |
| Librarian | `library@ims.edu.pk` / `lib123` | Catalog, issue/return |
| Receptionist | `reception@ims.edu.pk` / `recv123` | Inquiries, lookup |

- [ ] Each portal above: login, nav, scoped data (no other school's records)
- [ ] Teacher offline attendance queues and syncs when online
- [ ] Parent Urdu locale switch renders RTL on portal shell

## Multi-tenant isolation

- [ ] User A (school 1) cannot read/write school 2 data via API (403)
- [ ] Super Admin without impersonation uses platform APIs only

## Mobile / PWA

- [ ] Parent fees page usable on phone width (scroll tables)
- [ ] Add to home screen (manifest) on Android/iOS
- [ ] Service worker registers without console errors

## Automated tests (CI)

```bash
npm test
npx tsc --noEmit
npm run build
```

- [ ] All unit tests pass
- [ ] Production build succeeds

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product owner | | | |
| School admin (pilot) | | | |
| Technical lead | | | |
