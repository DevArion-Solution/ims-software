# IMS Manual UAT Walkthrough (Main Features)

Follow this guide **in order**. After each step works, tick the matching box in [`UAT-CHECKLIST.md`](./UAT-CHECKLIST.md).

**App URL:** http://localhost:3000/login  

**Tip:** On the login page you can tap a **role card** (it fills email/password and signs in). Or type credentials manually.

---

## Before you start

1. PostgreSQL is running.
2. In the project folder run: `npm run dev`
3. Open http://localhost:3000/login
4. Keep a notepad: write **PASS** / **FAIL** + a short note if something breaks.
5. Prefer a **private/incognito** window when switching portals (or always **Logout** first).

### Demo logins

| Who | Email | Password | Home after login |
|-----|-------|----------|------------------|
| Super Admin | `super@ims.cloud` | `super123` | `/super-admin` |
| School Admin | `admin@ims.edu.pk` | `admin123` | `/dashboard` |
| Teacher | `teacher@ims.edu.pk` | `teach123` | `/teacher` |
| Accountant | `accounts@ims.edu.pk` | `fees123` | `/accountant` |
| Parent | `parent@ims.edu.pk` | `parent123` | `/parent` |
| Student | `student@ims.edu.pk` | `stu123` | `/student` |
| Principal | `principal@ims.edu.pk` | `prin123` | `/principal` |
| Librarian | `library@ims.edu.pk` | `lib123` | `/librarian` |
| Receptionist | `reception@ims.edu.pk` | `recv123` | `/receptionist` |

---

## Part A — Security (10 minutes)

### A1. Guest cannot open admin
1. Logout (or use a fresh private window).
2. Open http://localhost:3000/dashboard  
**Expect:** redirect to `/login?from=%2Fdashboard`  
→ Tick: *Unauthenticated user visiting `/dashboard` redirects to `/login`*

### A2. Wrong portal blocked
1. Login as **Teacher**.
2. In the address bar open http://localhost:3000/accountant  
**Expect:** you stay on Teacher (or are sent back to Teacher home), not Accountant desk.  
→ Tick: *Wrong portal user cannot open another portal URL*

### A3. Logout
1. Click **Logout**.
2. Press browser **Back**.  
**Expect:** still logged out / login page, not the private page.  
→ Tick: *Logout clears session; back button does not restore access*

*(Suspend school + Super Admin impersonation: do in Part B when you are on Super Admin.)*

---

## Part B — Super Admin (15–20 minutes)

Login: **Super Admin** card / `super@ims.cloud` / `super123`

### B1. Command Center
Open Command Center (home).  
**Expect:** school counts, MRR, charts or summary cards look sensible (not blank/crash).  
→ Tick: *Command Center shows school counts, MRR, charts*

### B2. Schools — suspend / activate
1. Open **Schools**.
2. Find **Horizon Public School** (or any active school).
3. **Suspend**, then try School Admin login in another window → should be blocked with a clear message.
4. **Activate** again, confirm Admin can login.  
→ Tick: *Suspend / activate school*  
→ Tick: *Suspended school blocked at login with clear message*

### B3. Registrations (if any pending)
Open **Registrations**. Approve one if available → credentials modal once.  
→ Tick: *Approve registration → admin credentials modal (once)*  
*(If list is empty, mark as N/A and skip.)*

### B4. Billing
Open **Billing**. Run / check sweep or overdue handling if the UI offers it.  
→ Tick: *Billing sweep…* (as far as the UI allows)

### B5. Module Access
Open **Module Access** (or school modules). Toggle a module for Horizon (e.g. Hostel). Confirm Admin sidebar changes after refresh. Restore modules after test.  
→ Tick: *Plan modules toggle affects school portal access*

### B6. Integrations status
Open **Platform Settings**.  
**Expect:** sandbox / live status for payment & notify rails.  
→ Tick: *Integration status panel shows sandbox/live rails*

### B7. Impersonation / support mode
If the UI has **Open as support** / impersonate for a school:
1. Enter support mode.
2. Exit.
3. Open **Audit Log** — enter/exit should appear.  
→ Tick: *Super Admin impersonation logs enter/exit in Audit log*

Logout Super Admin when done.

---

## Part C — School Admin main features (40–50 minutes)

Login: **Admin** / `admin@ims.edu.pk` / `admin123`

### C1. Dashboard
Open **Dashboard**.  
**Expect:** Active students, fees pending/collected, staff — numbers look consistent with Students / Fees pages.  
→ Tick: *Dashboard stats match student/fee counts*

### C2. Students
1. **Students → Add student** (fill required fields, pick class/section).
2. Save → student appears in list.
3. Open **Academics** — class strength should reflect the new student (or after refresh).  
→ Tick: *Add student → appears in list and class strength*

### C3. Admissions
1. **Admissions** → create or open an application.
2. Use **Enroll** if available (class/section/DOB, fee structure).  
**Expect:** student created / pipeline updates; optional challan.

### C4. Attendance
1. **Attendance** → pick class/section/date → mark Present/Absent/Late.
2. Save. Check history % looks reasonable.  
→ Tick (partial): *Mark attendance (admin…)*

### C5. Exams & report card
1. **Exams** → open/publish an exam if needed.
2. Enter marks for a class.
3. Open a student → print **/report-card/[studentId]** (or link from student profile).  
**Expect:** subjects, %, grade print cleanly.  
→ Tick: *Enter exam marks → report card print*

### C6. Fees
1. **Fees** → generate challan (single or mass for a class/month).
2. Open print **/challan/[id]** from the challan link.  
**Expect:** base / discount / late / net look correct.  
→ Tick: *Generate fee challan → print challan page*

### C7. Accounts
1. **Accounts → Reconcile** — note Fee ↔ ledger gap KPI.
2. **Ledger** — set date From/To and Campus filter; list should shrink.
3. Download CSV from Ledger / Expenses / Reconcile if buttons exist.  
→ Tick: *Accounts reconcile…*  
→ Tick: *Accounts date + campus filters…*

### C8. Staff / payroll
1. **Staff** → Leaves / Payroll area (or Accounts → Payroll).
2. Generate salaries for a month → Pay one line → open **/payslip/[id]**.  
**Expect:** basic, allowances, deductions, net look sensible.  
→ Tick: *Payroll run → payslip values sensible*

### C9. Library / Transport / Hostel / Inventory
Open each page from the sidebar (**Campus Services**):
- Library — issue a book to a student/staff id; return; check overdue/fine if due date past.
- Transport — routes / riders load.
- Hostel — rooms / allotments load.
- Inventory — stock list / PO area loads.  
→ Tick: *Library issue/return + overdue fine* (do at least issue/return)  
→ Tick: *Transport/hostel pages load for enabled plans*

### C10. Communication
1. **Communication** → create/send a notice (SMS or email is fine in sandbox).
2. Check delivery log shows sandbox/live/fail style entries.  
→ Tick: *Send notice… → delivery log entries*

### C11. Reports
**Reports** → click several CSV buttons (Students, Fees, Ledger, Transport, Hostel…).  
**Expect:** files download.  
→ Tick: *Reports CSV export downloads*

### C12. Settings (admin tools)
Do these carefully (prefer a copy of demo data):

1. **Import** — download student CSV template → import 1–2 rows.  
→ Tick: *CSV import students*
2. **Users & RBAC** — create a system user with only some modules + portal login; copy password once; login as that user; open a blocked module URL → restricted.  
→ Tick: *Create system user + portal login*  
→ Tick: *Module ACL…*
3. **Audit log** — filter/export; confirm recent actions appear.  
→ Tick: *School audit log records key actions*
4. **Backup** — download workspace JSON. *(Restore only if you accept overwriting — use a spare DB if possible.)*  
→ Tick: *Backup download + restore (test on copy)*
5. **Academic year rollover** — only if you understand it promotes/graduates classes; otherwise skip and note N/A.  
→ Tick or N/A: *Academic year rollover…*

Logout Admin.

---

## Part D — Accountant portal (15 minutes)

Login: **Accountant** / `accounts@ims.edu.pk` / `fees123`

1. **Fee Collection** — collect a pending challan (cash/bank).  
2. Open **Vouchers** — a receipt for Student Fee Income should appear.  
→ Tick: *Collect fee (accountant) → voucher posted*
3. **Reports** — export Fees / Ledger / Expenses / Trips / Payroll / Reconcile CSVs.  
→ Tick: *Accountant portal reports… CSVs*
4. Spot-check **Challans**, **Payroll**, **Expenses**.

Logout.

---

## Part E — Other role portals (20–25 minutes)

For **each** role below: login → click every main nav item → confirm page loads and data looks school-scoped (Horizon demo), then logout.

| Portal | What to click / do |
|--------|---------------------|
| **Teacher** | Classes, Timetable, Attendance (mark one day), Marks, Homework, Leave, Notices |
| **Parent** | Child switcher (if more than one), Fees, Attendance, Results, Homework, Notices; try **Pay** on a fee (sandbox JazzCash/Easypaisa/card) |
| **Student** | Timetable, Results, Fees, Attendance, Homework, Notices |
| **Principal** | Pulse/home, Approvals, Staff, Reports |
| **Librarian** | Catalog, Issue/Return |
| **Receptionist** | Inquiries, Visitors, Student lookup |

→ Tick: *Each portal above: login, nav, scoped data…*  
→ Tick: *Parent online pay (sandbox) → fee balance updates* (from Parent fees)  
→ Tick (partial): *Mark attendance (… teacher scoped classes)*

### Extra portal checks
1. Parent: switch language to **اردو** — layout should go RTL.  
→ Tick: *Parent Urdu locale switch renders RTL…*
2. Teacher offline attendance (optional): turn network off, mark attendance if UI queues, go online and sync.  
→ Tick or N/A: *Teacher offline attendance…*

---

## Part F — Quick extras (optional but useful)

### Mobile
Resize browser to phone width on Parent **Fees**. Tables should scroll, not explode layout.  
→ Tick: *Parent fees page usable on phone width*

### Automated (terminal)
```bash
npm test
npx tsc --noEmit
npm run build
```
→ Tick both CI boxes if all succeed.

### Multi-tenant API (advanced)
Only if you have a second school user: confirm school A cannot load school B data (403). Otherwise leave unchecked / N/A for pilot.

---

## Suggested testing order (one sitting ~2 hours)

1. Part A — Security  
2. Part C — School Admin (skip Settings restore/rollover first time if short on time)  
3. Part D — Accountant  
4. Part E — Teacher, Parent, Student (minimum three portals)  
5. Part B — Super Admin  
6. Remaining portals + Settings deep items  
7. Sign-off table in `UAT-CHECKLIST.md`

---

## If something fails

1. Write: **page URL + what you clicked + what you saw** (screenshot helps).
2. Try **Settings → Reset demo data** (school) only if you are OK resetting demo.
3. Do **not** tick the checklist box until it works.

When all main boxes are ticked, fill the **Sign-off** table at the bottom of `UAT-CHECKLIST.md`.
