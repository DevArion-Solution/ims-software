const base = "http://localhost:3000";

async function login(email, password) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const set = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const cookie = set.map((c) => c.split(";")[0]).join("; ");
  const json = await res.json();
  return { cookie, json, status: res.status };
}

async function page(cookie, path) {
  const res = await fetch(`${base}${path}`, {
    headers: cookie ? { cookie } : {},
    redirect: "follow",
  });
  const html = await res.text();
  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  return {
    status: res.status,
    len: html.length,
    login: html.includes("Welcome back"),
    restricted:
      html.includes("Access restricted") ||
      html.includes("not enabled on your school plan"),
    title: h1 ? h1[1] : "",
    url: res.url,
  };
}

async function main() {
  const a = await login("admin@ims.edu.pk", "admin123");
  console.log("admin login", a.status, a.json.ok);
  const adminRoutes = [
    "/dashboard",
    "/admissions",
    "/students",
    "/academics",
    "/attendance",
    "/exams",
    "/fees",
    "/accounts",
    "/staff",
    "/library",
    "/transport",
    "/hostel",
    "/inventory",
    "/communication",
    "/reports",
    "/settings",
  ];
  for (const r of adminRoutes) {
    const p = await page(a.cookie, r);
    console.log(
      ["ADMIN", p.status, r, p.restricted ? "RESTRICTED" : "ok", p.title || "(csr)"].join("|"),
    );
  }

  const portals = [
    [
      "accounts@ims.edu.pk",
      "fees123",
      [
        "/accountant",
        "/accountant/fees",
        "/accountant/reports",
        "/accountant/payroll",
        "/accountant/expenses",
        "/accountant/vouchers",
        "/accountant/challans",
      ],
    ],
    [
      "teacher@ims.edu.pk",
      "teach123",
      [
        "/teacher",
        "/teacher/classes",
        "/teacher/attendance",
        "/teacher/marks",
        "/teacher/timetable",
        "/teacher/homework",
        "/teacher/leave",
        "/teacher/notices",
      ],
    ],
    [
      "parent@ims.edu.pk",
      "parent123",
      [
        "/parent",
        "/parent/fees",
        "/parent/attendance",
        "/parent/results",
        "/parent/homework",
        "/parent/notices",
      ],
    ],
    [
      "student@ims.edu.pk",
      "stu123",
      [
        "/student",
        "/student/timetable",
        "/student/results",
        "/student/fees",
        "/student/attendance",
        "/student/homework",
        "/student/notices",
      ],
    ],
    [
      "principal@ims.edu.pk",
      "prin123",
      ["/principal", "/principal/approvals", "/principal/staff", "/principal/reports"],
    ],
    [
      "library@ims.edu.pk",
      "lib123",
      ["/librarian", "/librarian/catalog", "/librarian/issues"],
    ],
    [
      "reception@ims.edu.pk",
      "recv123",
      [
        "/receptionist",
        "/receptionist/inquiries",
        "/receptionist/visitors",
        "/receptionist/lookup",
      ],
    ],
    [
      "super@ims.cloud",
      "super123",
      [
        "/super-admin",
        "/super-admin/schools",
        "/super-admin/billing",
        "/super-admin/plans",
        "/super-admin/modules",
        "/super-admin/users",
        "/super-admin/audit",
        "/super-admin/settings",
        "/super-admin/registrations",
      ],
    ],
  ];

  for (const [email, pass, routes] of portals) {
    const s = await login(email, pass);
    console.log("LOGIN", email, s.status, s.json.ok, s.json.portal);
    for (const r of routes) {
      const p = await page(s.cookie, r);
      console.log(
        [
          "PORTAL",
          email.split("@")[0],
          p.status,
          r,
          p.restricted ? "RESTRICTED" : p.login ? "LOGIN_PAGE" : "ok",
          p.len,
        ].join("|"),
      );
    }
  }

  const u = await page("", "/dashboard");
  console.log(["UNAUTH", u.status, u.login ? "redirect-login" : "ok", u.url].join("|"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
