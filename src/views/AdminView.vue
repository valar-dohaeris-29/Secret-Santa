<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRouter } from "vue-router";
type List = {
  id: string;
  title: string;
  message: string;
  budget: string;
  names: string[];
  exclusions: string[][];
  status: string;
  version: number;
  links: { name: string; token: string }[];
};
const locationOrigin = location.origin;
const confirm = window.confirm.bind(window);
const props = defineProps<{ id?: string }>(),
  router = useRouter();
const authenticated = ref(false),
  checked = ref(false),
  password = ref(""),
  busy = ref(false),
  error = ref(""),
  notice = ref(""),
  lists = ref<List[]>([]),
  current = ref<List | null>(null),
  step = ref(1),
  namesText = ref(""),
  from = ref(""),
  to = ref("");
const heading = ref<HTMLElement | null>(null);
const fresh = (): List => ({
  id: "",
  title: "",
  message: "",
  budget: "",
  names: [],
  exclusions: [],
  status: "draft",
  version: 0,
  links: [],
});
const locked = computed(() => current.value?.status === "finalized");
async function api(path: string, method = "GET", body?: unknown) {
  const r = await fetch("/api" + path, {
    method,
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await r.json();
  if (!r.ok) {
    if (r.status === 401) authenticated.value = false;
    throw new Error(data.error || "Request failed.");
  }
  return data;
}
async function run(fn: () => Promise<void>) {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  notice.value = "";
  try {
    await fn();
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Please try again.";
  } finally {
    busy.value = false;
  }
}
async function load() {
  lists.value = await api("/admin/lists");
  if (props.id === "new") {
    current.value = fresh();
  } else if (props.id) {
    current.value = await api("/admin/lists/" + props.id);
    namesText.value = current.value!.names.join("\n");
    step.value = 5;
  }
}
async function login() {
  await run(async () => {
    await api("/session", "POST", { password: password.value });
    password.value = "";
    authenticated.value = true;
    await load();
  });
}
function parseNames() {
  const names = namesText.value.split(/\r?\n/).map((n) => n.trim());
  if (
    names.length < 2 ||
    names.length > 100 ||
    names.some((n) => !n || n.length > 80) ||
    new Set(names.map((n) => n.toLowerCase())).size !== names.length
  )
    throw new Error("Enter 2–100 unique, nonblank names (one per line).");
  current.value!.names = names;
  current.value!.exclusions = current.value!.exclusions.filter((p) =>
    p.every((n) => names.includes(n)),
  );
}
async function advance() {
  error.value = "";
  try {
    const l = current.value!;
    if (step.value === 1 && !l.title.trim()) throw new Error("Enter a title.");
    if (step.value === 3 && !l.budget.trim())
      throw new Error("Enter a gift budget.");
    if (step.value === 4) parseNames();
    step.value++;
    await nextTick();
    heading.value?.focus();
  } catch (e) {
    error.value = (e as Error).message;
  }
}
function exclude() {
  if (
    from.value &&
    to.value &&
    from.value !== to.value &&
    !current.value!.exclusions.some(
      (p) => p[0] === from.value && p[1] === to.value,
    )
  )
    current.value!.exclusions.push([from.value, to.value]);
}
async function save(navigate = true) {
  const l = current.value!;
  if (!locked.value) parseNames();
  const body = locked.value
    ? {
        title: l.title,
        message: l.message,
        budget: l.budget,
        version: l.version,
      }
    : {
        title: l.title,
        message: l.message,
        budget: l.budget,
        names: l.names,
        exclusions: l.exclusions,
        version: l.version,
      };
  current.value = await api(
    "/admin/lists" + (l.id ? "/" + l.id : ""),
    l.id ? "PATCH" : "POST",
    body,
  );
  if (!l.id && navigate) await router.replace("/admin/" + current.value!.id);
  notice.value = "Saved.";
}
async function finalize() {
  await save(false);
  const l = current.value!;
  current.value = await api("/admin/lists/" + l.id + "/finalize", "POST", {
    version: l.version,
  });
  notice.value = "Draw finalized. Share each personal link privately.";
  if (props.id === "new") await router.replace("/admin/" + l.id);
}
async function duplicate(id: string) {
  const copy = await api("/admin/lists/" + id + "/duplicate", "POST", {});
  await router.push("/admin/" + copy.id);
}
async function copy(token: string) {
  try {
    await navigator.clipboard.writeText(location.origin + "/s/" + token);
    notice.value = "Personal link copied.";
  } catch {
    error.value = "Copy was unavailable. Select and copy the link below.";
  }
}
onMounted(async () => {
  await run(async () => {
    authenticated.value = (await api("/session")).authenticated;
    if (authenticated.value) await load();
  });
  checked.value = true;
});
</script>
<template>
  <main class="santa-page">
    <div class="site-mark">✧ A LITTLE CHRISTMAS MAGIC</div>
    <section class="santa-card admin-card" aria-labelledby="admin-title">
      <div class="admin-top">
        <RouterLink to="/">← Home</RouterLink
        ><button
          v-if="authenticated"
          class="text-button"
          :disabled="busy"
          @click="
            run(async () => {
              await api('/session', 'DELETE', {});
              authenticated = false;
              current = null;
              lists = [];
            })
          "
        >
          Log out
        </button>
      </div>
      <p class="eyebrow">The organizer’s workshop</p>
      <h1 id="admin-title">Secret Santa lists</h1>
      <p v-if="!checked">Checking your session…</p>
      <form
        v-else-if="!authenticated"
        class="admin-form"
        @submit.prevent="login"
      >
        <label for="password">Admin password</label
        ><input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          maxlength="200"
        /><button class="primary" :disabled="busy">
          {{ busy ? "Signing in…" : "Sign in" }}
        </button>
      </form>
      <template v-else-if="!current">
        <RouterLink class="primary link-button" to="/admin/new"
          >Create a list <span>+</span></RouterLink
        >
        <p v-if="!lists.length" class="intro">
          Your workshop is empty. Create your first list.
        </p>
        <article v-for="list in lists" :key="list.id" class="list-row">
          <div>
            <RouterLink :to="'/admin/' + list.id">{{ list.title }}</RouterLink>
            <p>
              {{ list.names.length }} people · {{ list.status }} ·
              {{ list.budget }}
            </p>
          </div>
          <button
            class="secondary"
            :disabled="busy"
            @click="run(() => duplicate(list.id))"
          >
            Duplicate
          </button>
        </article>
      </template>
      <template v-else>
        <RouterLink class="back-link" to="/admin">← All lists</RouterLink>
        <p class="field-help">
          {{
            locked
              ? "Finalized · Names, exclusions and assignments are locked."
              : "Draft · No assignments until you generate the draw."
          }}
        </p>
        <h2 ref="heading" tabindex="-1">
          {{
            locked
              ? "List details"
              : `Step ${step} of 5 · ${["Title", "Message", "Gift budget", "Participants", "Exclusions"][step - 1]}`
          }}
        </h2>
        <form
          class="admin-form"
          @submit.prevent="step < 5 ? advance() : run(() => save())"
        >
          <template v-if="step === 1 || step === 5"
            ><label for="title">List title</label
            ><input id="title" v-model="current.title" maxlength="120" required
          /></template>
          <template v-if="step === 2 || step === 5"
            ><label for="message">Short message (optional)</label
            ><textarea
              id="message"
              v-model="current.message"
              maxlength="1000"
              rows="3"
            ></textarea>
          </template>
          <template v-if="step === 3 || step === 5"
            ><label for="budget">Gift budget</label
            ><input
              id="budget"
              v-model="current.budget"
              maxlength="100"
              placeholder="R300"
              required
          /></template>
          <template v-if="step === 4 || (step === 5 && !locked)"
            ><label for="names">Participant names</label>
            <p class="field-help">
              Type names individually on separate lines, or paste a list. 2–100
              people; no blank or duplicate names.
            </p>
            <textarea
              id="names"
              v-model="namesText"
              rows="7"
              @change="
                () => {
                  try {
                    parseNames();
                  } catch (e) {
                    error = (e as Error).message;
                  }
                }
              "
            ></textarea>
          </template>
          <template v-if="step === 5 && !locked"
            ><h3>Who can’t draw whom?</h3>
            <p class="field-help">
              Everyone is automatically excluded from drawing themselves. Each
              extra exclusion works in one direction only.
            </p>
            <div class="exclusion-picker">
              <label for="giver"
                >Giver<select id="giver" aria-label="Giver" v-model="from">
                  <option value="">Choose giver</option>
                  <option v-for="name in current.names" :key="name">
                    {{ name }}
                  </option>
                </select></label
              ><label for="excluded"
                >Cannot draw<select
                  id="excluded"
                  aria-label="Cannot draw"
                  v-model="to"
                >
                  <option value="">Choose recipient</option>
                  <option
                    v-for="name in current.names.filter((n) => n !== from)"
                    :key="name"
                  >
                    {{ name }}
                  </option>
                </select></label
              ><button type="button" class="secondary" @click="exclude">
                Add
              </button>
            </div>
            <ul class="exclusions">
              <li v-for="(pair, i) in current.exclusions" :key="i">
                {{ pair[0] }} → cannot draw {{ pair[1] }}
                <button
                  type="button"
                  class="text-button"
                  :aria-label="`Remove exclusion for ${pair[0]} and ${pair[1]}`"
                  @click="current.exclusions.splice(i, 1)"
                >
                  Remove
                </button>
              </li>
            </ul></template
          >
          <div class="actions">
            <button
              v-if="step > 1 && !locked"
              type="button"
              class="secondary"
              @click="step--"
            >
              Back</button
            ><button class="primary" :disabled="busy">
              {{ step < 5 ? "Continue" : busy ? "Saving…" : "Save changes" }}
            </button>
          </div>
        </form>
        <template v-if="step === 5"
          ><button
            v-if="!locked"
            class="primary generate"
            :disabled="busy"
            @click="run(finalize)"
          >
            Generate draw
          </button>
          <p v-if="!locked" class="field-help">
            Generating permanently locks names and exclusions. For a new draw,
            duplicate the list.
          </p>
          <button
            v-if="current.id"
            class="secondary"
            :disabled="busy"
            @click="run(() => duplicate(current!.id))"
          >
            Duplicate into a new draft
          </button>
          <button
            v-if="current.id && !locked"
            class="text-button"
            :disabled="busy"
            @click="
              run(async () => {
                if (confirm('Delete this draft?')) {
                  await api('/admin/lists/' + current!.id, 'DELETE', {});
                  await router.push('/admin');
                }
              })
            "
          >
            Delete draft
          </button></template
        >
        <section v-if="locked" class="personal-links">
          <h2>Personal invitations</h2>
          <p class="field-help">
            Share each link only with its named participant. Anyone with that
            link can reveal their recipient.
          </p>
          <article
            v-for="link in current.links"
            :key="link.token"
            class="invitation"
          >
            <label :for="link.token">{{ link.name }}</label
            ><input
              :id="link.token"
              :aria-label="`${link.name}’s personal link`"
              readonly
              :value="`${locationOrigin}/s/${link.token}`"
              @focus="($event.target as HTMLInputElement).select()"
            /><button class="secondary" @click="copy(link.token)">
              Copy link
            </button>
          </article>
        </section>
      </template>
      <p class="error" role="alert">{{ error }}</p>
      <p role="status">{{ notice }}</p>
    </section>
    <p class="page-footer">
      Made for giving. Wrapped in <RouterLink to="/admin">secrecy</RouterLink>.
    </p>
  </main>
</template>
