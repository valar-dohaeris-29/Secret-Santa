import { makeServer } from "../server/index.mjs";
import { makeApp, passwordHash } from "../server/app.mjs";
import { MemoryStore } from "../server/store.mjs";
const store = new MemoryStore();
makeServer({
  app: makeApp({
    store,
    secret: passwordHash("browser-test-only"),
    origin: "http://127.0.0.1:4173",
    secure: false,
  }),
}).listen(4173, "127.0.0.1");
