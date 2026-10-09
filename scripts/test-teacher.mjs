const base = "http://localhost:3000";

const ROUTES = [
  "/teacher",
  "/teacher/report",
  "/teacher/classes",
  "/teacher/attendance",
  "/teacher/marks",
  "/teacher/timetable",
  "/teacher/homework",
  "/teacher/leave",
  "/teacher/notices",
  // cross-portal should NOT open accountant desk
  "/accountant",
  "/dashboard",
];

async function login(email, password) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const set = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const cookie = set.map((c) => c.split(";")[0]).join("; ");
  const json = await res.json();
  return { status: res.status, cookie, json };
}

async function getPage(cookie, path) {
  const res = await fetch(`${base}${path}`, {
    headers: { cookie },
    redirect: "follow",
  });
  const html = await res.text();
  return {
    status: res.status,
    url: res.url,
    len: html.length,
    loginPage: html.includes("Welcome back"),
    restricted: html.includes("Access restricted") || html.includes("not enabled"),
    appError: /Application error|Unhandled Runtime Error/i.test(html),
  };
}

async function main() {
  const auth = await login("teacher@ims.edu.pk", "teach123");
  console.log(
    JSON.stringify(
      {
        login: {
          status: auth.status,
          ok: auth.json.ok,
          portal: auth.json.portal,
          name: auth.json.session?.user?.name,
          email: auth.json.session?.user?.email,
        },
      },
      null,
      2,
    ),
  );

  const results = [];
  for (const path of ROUTES) {
    const p = await getPage(auth.cookie, path);
    const row = {
      path,
      status: p.status,
      finalUrl: p.url.replace(base, ""),
      loginPage: p.loginPage,
      restricted: p.restricted,
      appError: p.appError,
      bytes: p.len,
    };
    results.push(row);
    console.log(
      [
        p.appError ? "ERR" : p.loginPage ? "LOGIN" : p.status === 200 ? "OK" : "FAIL",
        path,
        "->",
        row.finalUrl,
        `status=${p.status}`,
      ].join(" | "),
    );
  }

  // school data scoped check
  const sd = await fetch(`${base}/api/school-data?tenantId=sch_horizon`, {
    headers: { cookie: auth.cookie },
  });
  const sdJson = await sd.json().catch(() => ({}));
  console.log(
    JSON.stringify(
      {
        schoolData: {
          status: sd.status,
          hasData: !!sdJson.data,
          students: sdJson.data?.students?.length ?? 0,
          classes: sdJson.data?.classes?.length ?? 0,
          homework: sdJson.data?.homework?.length ?? 0,
          leaves: sdJson.data?.leaves?.length ?? 0,
          exams: sdJson.data?.exams?.length ?? 0,
        },
        routes: results,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
