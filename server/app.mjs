import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { createDraw } from "./draw.mjs";
const hash = (s) => createHash("sha256").update(s).digest("hex");
export const passwordHash = (password) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
};
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
function metadata(body) {
  const value = (key, max, required = true) => {
    if (
      typeof body[key] !== "string" ||
      body[key].trim().length > max ||
      (required && !body[key].trim())
    )
      fail(400, `Invalid ${key}.`);
    return body[key].trim();
  };
  return {
    title: value("title", 120),
    message: value("message", 1000, false),
    budget: value("budget", 100),
  };
}
function draft(body) {
  const meta = metadata(body);
  if (
    !Array.isArray(body.names) ||
    body.names.length < 2 ||
    body.names.length > 100
  )
    fail(400, "Use 2–100 participants.");
  const names = body.names.map((n) => (typeof n === "string" ? n.trim() : ""));
  if (
    names.some((n) => !n || n.length > 80) ||
    new Set(names.map((n) => n.toLowerCase())).size !== names.length
  )
    fail(400, "Names must be nonblank and unique.");
  if (
    !Array.isArray(body.exclusions) ||
    body.exclusions.some(
      (p) =>
        !Array.isArray(p) ||
        p.length !== 2 ||
        p.some((n) => !names.includes(n)),
    )
  )
    fail(400, "Invalid exclusions.");
  return { ...meta, names, exclusions: body.exclusions };
}
const publicList = (l) => ({
  id: l.sk,
  title: l.title,
  message: l.message,
  budget: l.budget,
  status: l.status,
  version: l.version,
  names: l.names,
  exclusions: l.exclusions,
  links:
    l.draw?.map((p) => ({ name: p.giver, token: `${l.sk}.${p.code}` })) || [],
});
export function makeApp({
  store,
  secret = process.env.ADMIN_PASSWORD_HASH,
  origin = process.env.APP_ORIGIN || "http://localhost:5173",
  secure = true,
  now = Date.now,
}) {
  if (!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(secret || ""))
    throw new Error("ADMIN_PASSWORD_HASH must be configured.");
  return async ({ method, path, headers = {}, body = "", ip = "unknown" }) => {
    const response = {
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
        "x-content-type-options": "nosniff",
      },
      statusCode: 200,
    };
    const cookie = (token, age) =>
      `santa_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? "; Secure" : ""}`;
    try {
      if (!["GET", "HEAD"].includes(method)) {
        if (headers.origin !== origin) fail(403, "Invalid request origin.");
        if (!headers["content-type"]?.startsWith("application/json"))
          fail(415, "JSON required.");
      }
      if (Buffer.byteLength(body) > 200000) fail(413, "Request too large.");
      let input = {};
      if (body) {
        try {
          input = JSON.parse(body);
        } catch {
          fail(400, "Invalid JSON.");
        }
        if (!input || typeof input !== "object" || Array.isArray(input))
          fail(400, "Invalid request.");
      }
      const seconds = Math.floor(now() / 1000);
      const sessionToken = headers.cookie?.match(
        /(?:^|;\s*)santa_session=([a-f0-9]{64})(?:;|$)/,
      )?.[1];
      const session = sessionToken
        ? await store.get("SESSION", hash(sessionToken))
        : null;
      const authenticated = !!session && session.expires > seconds;
      let data;
      if (path === "/api/session" && method === "POST") {
        const count = await store.attempt(
          `${hash(ip)}:${Math.floor(seconds / 900)}`,
          seconds + 1800,
        );
        if (count > 10) {
          response.headers["retry-after"] = "900";
          fail(429, "Too many login attempts. Try again in 15 minutes.");
        }
        const [salt, digest] = secret.split(":");
        if (
          typeof input.password !== "string" ||
          input.password.length > 200 ||
          !timingSafeEqual(
            scryptSync(input.password, salt, 64),
            Buffer.from(digest, "hex"),
          )
        )
          fail(401, "Incorrect password.");
        if (sessionToken) await store.delete("SESSION", hash(sessionToken));
        const token = randomBytes(32).toString("hex");
        await store.put({
          pk: "SESSION",
          sk: hash(token),
          expires: seconds + 28800,
        });
        response.headers["set-cookie"] = cookie(token, 28800);
        data = { authenticated: true };
      } else if (path === "/api/session" && method === "GET") {
        data = { authenticated };
      } else if (path === "/api/session" && method === "DELETE") {
        if (sessionToken) await store.delete("SESSION", hash(sessionToken));
        response.headers["set-cookie"] = cookie("", 0);
        data = { authenticated: false };
      } else if (path.startsWith("/api/admin/")) {
        if (!authenticated) fail(401, "Please sign in.");
        const match = path.match(
          /^\/api\/admin\/lists(?:\/([a-f0-9-]{36})(?:\/(duplicate|finalize))?)?$/,
        );
        if (!match) fail(404, "Not found.");
        const [, id, action] = match;
        if (!id && method === "GET")
          data = (await store.lists())
            .filter((l) => l.status !== "deleted")
            .map(publicList);
        else if (!id && method === "POST") {
          const l = {
            ...draft(input),
            pk: "LIST",
            sk: randomUUID(),
            status: "draft",
            version: 1,
          };
          await store.put(l);
          data = publicList(l);
          response.statusCode = 201;
        } else {
          const l = await store.get("LIST", id);
          if (!l || l.status === "deleted") fail(404, "List not found.");
          if (!action && method === "GET") data = publicList(l);
          else if (action === "duplicate" && method === "POST") {
            const copy = {
              ...draft(l),
              pk: "LIST",
              sk: randomUUID(),
              status: "draft",
              version: 1,
            };
            await store.put(copy);
            data = publicList(copy);
          } else if (action === "finalize" && method === "POST") {
            if (l.status === "finalized") data = publicList(l);
            else {
              if (input.version !== l.version)
                fail(409, "List changed. Reload before generating.");
              let draw;
              try {
                draw = createDraw(
                  Object.fromEntries(
                    l.names.map((n) => [
                      n,
                      l.exclusions.filter((p) => p[0] === n).map((p) => p[1]),
                    ]),
                  ),
                );
              } catch {
                fail(422, "No valid draw exists. Review the exclusions.");
              }
              const next = {
                ...l,
                status: "finalized",
                draw,
                version: l.version + 1,
              };
              try {
                await store.put(next, l.version);
                data = publicList(next);
              } catch (e) {
                if (e.name !== "ConditionalCheckFailedException") throw e;
                const latest = await store.get("LIST", id);
                if (latest.status !== "finalized")
                  fail(409, "List changed. Reload before generating.");
                data = publicList(latest);
              }
            }
          } else if (!action && method === "PATCH") {
            if (input.version !== l.version)
              fail(409, "List changed. Reload before saving.");
            if (
              l.status === "finalized" &&
              Object.keys(input).some(
                (k) => !["title", "message", "budget", "version"].includes(k),
              )
            )
              fail(409, "Finalized participants and assignments are locked.");
            const next = {
              ...l,
              ...(l.status === "draft" ? draft(input) : metadata(input)),
              version: l.version + 1,
            };
            await store.put(next, l.version);
            data = publicList(next);
          } else if (!action && method === "DELETE") {
            if (l.status !== "draft") fail(409, "Only drafts can be deleted.");
            const next = { ...l, status: "deleted", version: l.version + 1 };
            await store.put(next, l.version);
            data = { deleted: true };
          } else fail(404, "Not found.");
        }
      } else {
        const m = path.match(
          /^\/api\/s\/([a-f0-9-]{36})\.([a-f0-9]{32})(\/reveal)?$/,
        );
        if (!m || !((method === "GET" && !m[3]) || (method === "POST" && m[3])))
          fail(404, "Link not found.");
        const l = await store.get("LIST", m[1]),
          person =
            l?.status === "finalized" && l.draw.find((p) => p.code === m[2]);
        if (!person)
          fail(
            404,
            "This personal link is invalid. Ask your organizer for a new link.",
          );
        data = m[3]
          ? { recipient: person.recipient }
          : {
              title: l.title,
              message: l.message,
              budget: l.budget,
              name: person.giver,
            };
      }
      response.body = JSON.stringify(data);
    } catch (e) {
      response.statusCode =
        e.status || (e.name === "ConditionalCheckFailedException" ? 409 : 500);
      response.body = JSON.stringify({
        error: e.status
          ? e.message
          : response.statusCode === 409
            ? "List changed. Reload and try again."
            : "Something went wrong. Please try again.",
      });
    }
    return response;
  };
}
