import { makeApp } from "./app.mjs";
import { DynamoStore } from "./store.mjs";
const app = makeApp({ store: new DynamoStore() });
export async function handler(event) {
  const headers = {
    ...event.headers,
    cookie: (event.cookies || []).join("; "),
  };
  const result = await app({
    method: event.requestContext.http.method,
    path: event.rawPath,
    headers,
    body: event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64").toString()
      : event.body || "",
    ip: event.requestContext.http.sourceIp,
  });
  if (result.headers["set-cookie"]) {
    result.cookies = [result.headers["set-cookie"]];
    delete result.headers["set-cookie"];
  }
  return result;
}
