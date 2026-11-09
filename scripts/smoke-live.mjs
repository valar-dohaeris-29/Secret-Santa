import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const origin = "https://www.santa.deuel.pro";
let password = "";
for await (const chunk of process.stdin) password += chunk;
password = password.trimEnd();
let cookie = "",
  id;
async function api(path, method = "GET", body) {
  const r = await fetch(origin + "/api" + path, {
    method,
    headers: { origin, "content-type": "application/json", cookie },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  assert.match(r.headers.get("content-type"), /application\/json/);
  assert.match(r.headers.get("cache-control"), /no-store/);
  if (r.headers.get("set-cookie"))
    cookie = r.headers.get("set-cookie").split(";")[0];
  return { status: r.status, data: await r.json() };
}
try {
  for (const path of ["/", "/admin", "/admin/new", "/s/invalid"]) {
    const r = await fetch(origin + path);
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type"), /text\/html/);
  }
  const redirect = await fetch("https://santa.deuel.pro/admin", {
    redirect: "manual",
  });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get("location"), origin + "/admin");
  assert.equal((await api("/admin/lists")).status, 401);
  assert.equal((await api("/unknown")).status, 404);
  assert.equal((await api("/session", "POST", { password })).status, 200);
  password = "";
  const created = await api("/admin/lists", "POST", {
    title: "Deployment verification (temporary)",
    message: "Test only",
    budget: "R300",
    names: ["Test A", "Test B", "Test C"],
    exclusions: [["Test A", "Test C"]],
  });
  assert.equal(created.status, 201);
  id = created.data.id;
  const finalized = await Promise.all(
    [1, 2].map(() =>
      api("/admin/lists/" + id + "/finalize", "POST", {
        version: created.data.version,
      }),
    ),
  );
  assert.ok(finalized.every((r) => r.status === 200));
  assert.deepEqual(finalized[0].data, finalized[1].data);
  const link = finalized[0].data.links.find((p) => p.name === "Test A").token;
  assert.equal((await api("/s/" + link)).data.name, "Test A");
  const reveal = await api("/s/" + link + "/reveal", "POST", {});
  assert.equal(reveal.data.recipient, "Test B");
  assert.deepEqual(
    (await api("/s/" + link + "/reveal", "POST", {})).data,
    reveal.data,
  );
  assert.equal((await fetch(origin + "/s/" + link)).status, 200);
  assert.equal((await api("/session", "DELETE", {})).status, 200);
  assert.equal((await api("/admin/lists")).status, 401);
  const bucket = execFileSync(
    "tofu",
    ["-chdir=infra", "output", "-raw", "bucket"],
    { encoding: "utf8" },
  ).trim();
  assert.equal(
    (await fetch(`https://${bucket}.s3.af-south-1.amazonaws.com/index.html`))
      .status,
    403,
  );
  console.log(
    "PASS: HTTPS, canonical redirect, nested SPA routes, JSON/no-store errors, login/logout, DynamoDB concurrent finalization, personal links, stable reveals, private S3.",
  );
} finally {
  // Remove only this script's temporary verification list. Real finalized lists remain immutable through the API.
  if (id)
    execFileSync(
      "aws",
      [
        "dynamodb",
        "delete-item",
        "--region",
        "af-south-1",
        "--table-name",
        "secret-santa-prod",
        "--key",
        JSON.stringify({ pk: { S: "LIST" }, sk: { S: id } }),
      ],
      { stdio: "pipe" },
    );
}
