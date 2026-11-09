import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { makeApp } from "./app.mjs";
import { DynamoStore } from "./store.mjs";
export function makeServer({
  app = makeApp({
    store: new DynamoStore(),
    secure: process.env.NODE_ENV === "production",
  }),
  dist = resolve("dist"),
} = {}) {
  return createServer(async (req, res) => {
    const send = (r) => {
      res.writeHead(r.statusCode, r.headers);
      res.end(r.body);
    };
    try {
      const path = new URL(req.url, "http://localhost").pathname;
      if (path === "/api" || path.startsWith("/api/")) {
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 200000) {
            send({
              statusCode: 413,
              headers: {
                "content-type": "application/json",
                "cache-control": "no-store",
              },
              body: '{"error":"Request too large."}',
            });
            return;
          }
        }
        return send(
          await app({
            method: req.method,
            path,
            headers: req.headers,
            body,
            ip: req.socket.remoteAddress,
          }),
        );
      }
      if (!["GET", "HEAD"].includes(req.method)) throw new Error();
      let file = resolve(dist, decodeURIComponent(path).replace(/^\//, ""));
      if (!file.startsWith(dist + sep)) file = resolve(dist, "index.html");
      if (
        path === "/" ||
        path === "/admin" ||
        path.startsWith("/admin/") ||
        path.startsWith("/s/")
      )
        file = resolve(dist, "index.html");
      const body = await readFile(file);
      res.writeHead(200, {
        "Content-Type":
          {
            ".html": "text/html",
            ".js": "text/javascript",
            ".css": "text/css",
            ".jpg": "image/jpeg",
            ".svg": "image/svg+xml",
            ".ico": "image/x-icon",
          }[extname(file)] || "application/octet-stream",
        "Referrer-Policy": "no-referrer",
      });
      res.end(req.method === "HEAD" ? undefined : body);
    } catch {
      send({
        statusCode: 404,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
        body: '{"error":"Not found."}',
      });
    }
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  makeServer().listen(Number(process.env.PORT || 3001), "127.0.0.1", () =>
    console.log("Secret Santa server ready."),
  );
