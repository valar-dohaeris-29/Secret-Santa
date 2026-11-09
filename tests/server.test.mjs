import { test } from "node:test";
import assert from "node:assert/strict";
import { createDraw, validateDraw } from "../server/draw.mjs";
import { makeApp, passwordHash } from "../server/app.mjs";
import { MemoryStore } from "../server/store.mjs";
import { makeServer } from "../server/index.mjs";
const secret = passwordHash("test password"),
  origin = "https://santa.test";
const sample = {
  title: "Christmas",
  message: "Have fun",
  budget: "R300",
  names: ["A", "B", "C"],
  exclusions: [["A", "C"]],
};
function fixture() {
  const store = new MemoryStore();
  let time = 1000000000000;
  const app = makeApp({ store, secret, origin, now: () => time });
  let cookie = "";
  return {
    store,
    app,
    advance: (ms) => (time += ms),
    async call(path, method = "GET", body, headers = {}) {
      const r = await app({
        path,
        method,
        body: body === undefined ? "" : JSON.stringify(body),
        headers: {
          origin,
          "content-type": "application/json",
          cookie,
          ...headers,
        },
        ip: "1.2.3.4",
      });
      if (r.headers["set-cookie"])
        cookie = r.headers["set-cookie"].split(";")[0];
      return { ...r, data: JSON.parse(r.body) };
    },
    async login() {
      return this.call("/api/session", "POST", { password: "test password" });
    },
  };
}
test("matching preserves directional exclusions, uniqueness, and self-exclusion", () => {
  const exclusions = { A: ["C"], B: [], C: [] };
  for (let i = 0; i < 30; i++)
    assert.ok(validateDraw(createDraw(exclusions), exclusions));
  assert.throws(() => createDraw({ A: ["B"], B: [] }), /No valid draw/);
});
test("authentication, origin, cookie flags, logout and expiry", async () => {
  const f = fixture();
  assert.equal((await f.call("/api/admin/lists")).statusCode, 401);
  assert.equal(
    (await f.call("/api/session", "POST", { password: "bad" })).statusCode,
    401,
  );
  assert.equal(
    (
      await f.call(
        "/api/session",
        "POST",
        { password: "test password" },
        { origin: "https://evil.test" },
      )
    ).statusCode,
    403,
  );
  const login = await f.login();
  assert.equal(login.statusCode, 200);
  for (const flag of ["HttpOnly", "Secure", "SameSite=Strict", "Max-Age=28800"])
    assert.ok(login.headers["set-cookie"].includes(flag));
  assert.equal((await f.call("/api/admin/lists")).statusCode, 200);
  f.advance(28800001);
  assert.equal((await f.call("/api/admin/lists")).statusCode, 401);
  await f.login();
  await f.call("/api/session", "DELETE", {});
  assert.equal((await f.call("/api/admin/lists")).statusCode, 401);
});
test("login rate limit persists across application instances", async () => {
  const f = fixture();
  for (let i = 0; i < 10; i++)
    await f.call("/api/session", "POST", { password: "wrong" });
  assert.equal((await f.login()).statusCode, 429);
  const other = makeApp({
    store: f.store,
    secret,
    origin,
    now: () => 1000000000000,
  });
  assert.equal(
    (
      await other({
        path: "/api/session",
        method: "POST",
        body: '{"password":"test password"}',
        headers: { origin, "content-type": "application/json" },
        ip: "1.2.3.4",
      })
    ).statusCode,
    429,
  );
  f.advance(900000);
  assert.equal((await f.login()).statusCode, 200);
});
test("input validation and impossible draw leave draft untouched", async () => {
  const f = fixture();
  await f.login();
  for (const change of [
    { names: ["A", "a"] },
    { names: ["A", " "] },
    { names: ["A"] },
    { names: Array(101).fill("A") },
    { budget: "" },
    { title: "" },
    { exclusions: [["A", "unknown"]] },
  ])
    assert.equal(
      (await f.call("/api/admin/lists", "POST", { ...sample, ...change }))
        .statusCode,
      400,
    );
  const l = (
    await f.call("/api/admin/lists", "POST", {
      ...sample,
      names: ["A", "B"],
      exclusions: [["A", "B"]],
    })
  ).data;
  assert.equal(
    (
      await f.call(`/api/admin/lists/${l.id}/finalize`, "POST", {
        version: l.version,
      })
    ).statusCode,
    422,
  );
  const saved = await f.store.get("LIST", l.id);
  assert.equal(saved.status, "draft");
  assert.equal(saved.draw, undefined);
});
test("concurrent finalization is atomic; links and assignments remain stable", async () => {
  const f = fixture();
  await f.login();
  const l = (await f.call("/api/admin/lists", "POST", sample)).data;
  const path = "/api/admin/lists/" + l.id;
  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      f.call(path + "/finalize", "POST", { version: l.version }),
    ),
  );
  assert.ok(results.every((r) => r.statusCode === 200));
  assert.ok(
    results.every(
      (r) => JSON.stringify(r.data) === JSON.stringify(results[0].data),
    ),
  );
  const done = results[0].data;
  assert.equal(done.draw, undefined);
  assert.equal(done.links.length, 3);
  const recipients = [];
  for (const link of done.links) {
    const detail = await f.call("/api/s/" + link.token);
    assert.equal(detail.data.name, link.name);
    assert.equal(detail.data.recipient, undefined);
    const reveal = await f.call("/api/s/" + link.token + "/reveal", "POST", {});
    assert.notEqual(reveal.data.recipient, link.name);
    assert.deepEqual(
      (await f.call("/api/s/" + link.token + "/reveal", "POST", {})).data,
      reveal.data,
    );
    recipients.push(reveal.data.recipient);
  }
  assert.equal(new Set(recipients).size, 3);
  assert.equal(
    (await f.call(path, "PATCH", { ...sample, version: done.version }))
      .statusCode,
    409,
  );
  const edited = await f.call(path, "PATCH", {
    title: "New title",
    message: "New message",
    budget: "R400",
    version: done.version,
  });
  assert.equal(edited.statusCode, 200);
  assert.deepEqual(edited.data.links, done.links);
  assert.equal(
    (await f.call("/api/s/" + done.links[0].token)).data.title,
    "New title",
  );
  const copy = (await f.call(path + "/duplicate", "POST", {})).data;
  assert.equal(copy.status, "draft");
  assert.deepEqual(copy.names, done.names);
  assert.deepEqual(copy.exclusions, done.exclusions);
  assert.deepEqual(copy.links, []);
  const next = (
    await f.call("/api/admin/lists/" + copy.id + "/finalize", "POST", {
      version: copy.version,
    })
  ).data;
  assert.ok(
    next.links.every((p) => !done.links.some((q) => q.token === p.token)),
  );
  assert.equal((await f.call(path, "DELETE", {})).statusCode, 409);
});
test("stale edits, deleted drafts, invalid links, old groups and JSON errors", async () => {
  const f = fixture();
  await f.login();
  const l = (await f.call("/api/admin/lists", "POST", sample)).data;
  const path = "/api/admin/lists/" + l.id;
  assert.equal(
    (await f.call(path, "PATCH", { ...sample, version: 0 })).statusCode,
    409,
  );
  await f.call(path, "DELETE", {});
  assert.equal((await f.call(path)).statusCode, 404);
  assert.deepEqual((await f.call("/api/admin/lists")).data, []);
  for (const path of ["/api/groups/ellans", "/api/s/invalid", "/api/nope"]) {
    const r = await f.call(path);
    assert.equal(r.statusCode, 404);
    assert.equal(r.headers["cache-control"], "no-store");
    assert.equal(r.headers["content-type"], "application/json");
  }
  const r = await f.app({
    method: "POST",
    path: "/api/session",
    headers: { origin, "content-type": "application/json" },
    body: "{",
  });
  assert.equal(r.statusCode, 400);
});
test("Node adapter serves direct SPA routes, protects private files and keeps API errors JSON", async () => {
  const f = fixture(),
    server = makeServer({ app: f.app });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const path of ["/admin", "/admin/new", "/s/invalid"]) {
      const r = await fetch(base + path);
      assert.equal(r.status, 200);
      assert.match(r.headers.get("content-type"), /text\/html/);
    }
    for (const path of [
      "/server/groups.json",
      "/infra/secrets.auto.tfvars",
      "/.env",
      "/api/unknown",
    ]) {
      const r = await fetch(base + path);
      assert.equal(r.status, 404);
      assert.match(r.headers.get("content-type"), /application\/json/);
    }
  } finally {
    await new Promise((r) => server.close(r));
  }
});
