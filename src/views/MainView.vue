<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps<{ token?: string }>();
const recipient = ref('');
const error = ref('');
const loading = ref(false);
const ready = ref(false);
const celebrating = ref(false);
const input = ref<HTMLButtonElement | null>(null);
const result = ref<HTMLElement | null>(null);
const details = ref({ title: 'Secret Santa', budget: '', message: '', name: '' });
const controller = new AbortController();
let revealController: AbortController | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let motion: MediaQueryList | undefined;
const pieces = Array.from({ length: 36 }, (_, i) => ({
  left: `${(i * 37) % 100}%`, delay: `${(i % 6) * 0.08}s`,
  color: ['#e6bd6a', '#a8d4bf', '#e88d88'][i % 3],
}));

function stopCelebration() {
  celebrating.value = false;
  if (timer) clearTimeout(timer);
}
function hide(focus = true) {
  revealController?.abort();
  recipient.value = '';
  error.value = '';
  loading.value = false;
  stopCelebration();
  if (focus) nextTick(() => input.value?.focus());
}
function visibilityChanged() {
  if (document.hidden) hide(false);
}
function motionChanged() {
  if (motion?.matches) stopCelebration();
}
async function loadDetails() {
  error.value = '';
  try {
    const response = await fetch(`/api/s/${props.token}`, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) { const data = await response.json(); error.value = data.error; return; }
    details.value = await response.json();
    ready.value = true;
  } catch {
    if (!controller.signal.aborted) error.value = 'We couldn’t connect. Please try again.';
  }
}
async function reveal() {
  if (loading.value) return;
  error.value = '';
  loading.value = true;
  const request = new AbortController();
  revealController = request;
  try {
    const response = await fetch(`/api/s/${props.token}/reveal`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: '{}', signal: request.signal, cache: 'no-store',
    });
    const data = await response.json();
    if (!response.ok) { error.value = data.error || 'Please try again.'; return; }
    recipient.value = data.recipient;
    await nextTick();
    result.value?.focus();
    if (!motion?.matches) {
      celebrating.value = true;
      timer = setTimeout(stopCelebration, 3000);
    }
  } catch {
    if (!request.signal.aborted) error.value = 'We couldn’t connect. Check your connection and try again.';
  } finally {
    if (revealController === request) loading.value = false;
  }
}
onMounted(() => {
  motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  motion.addEventListener('change', motionChanged);
  document.addEventListener('visibilitychange', visibilityChanged);
  if (props.token) loadDetails();
});
onUnmounted(() => {
  controller.abort();
  revealController?.abort();
  stopCelebration();
  motion?.removeEventListener('change', motionChanged);
  document.removeEventListener('visibilitychange', visibilityChanged);
});
</script>

<template>
  <main class="santa-page">
    <div v-if="celebrating" class="confetti" aria-hidden="true">
      <span v-for="(piece, i) in pieces" :key="i" :style="{ left: piece.left, backgroundColor: piece.color, animationDelay: piece.delay }"></span>
    </div>
    <div class="site-mark"><span aria-hidden="true">✧</span> A LITTLE CHRISTMAS MAGIC</div>
    <section class="santa-card" aria-labelledby="page-title">
      <div class="gift-seal" aria-hidden="true">🎁</div>
      <p class="eyebrow">{{ details.title }}</p>
      <h1 id="page-title">Someone’s Christmas<br />starts with you.</h1>
      <p class="intro">A thoughtful gift. A little mystery. Your Secret Santa surprise is waiting.</p>

      <p v-if="!token" class="intro">Use the personal link sent by your organizer to discover who you’re buying for. Old group codes have been retired.</p>
      <form v-else-if="!recipient" class="reveal-form" @submit.prevent="reveal" :aria-busy="loading">
        <p v-if="ready" class="intro">Hello, {{ details.name }}. Ready for your surprise?</p>
        <p class="error" role="alert">{{ error }}</p>
        <button v-if="ready" ref="input" class="primary" :disabled="loading">{{ loading ? 'Opening your surprise…' : 'Reveal my person' }} <span aria-hidden="true">↗</span></button>
        <button v-else class="primary" type="button" @click="loadDetails">{{ error ? 'Try again' : 'Loading your invitation…' }}</button>
      </form>

      <div class="announcement" aria-live="polite" aria-atomic="true"><span v-if="recipient">You’re buying a gift for {{ recipient }}.</span></div>
      <section v-if="recipient" ref="result" class="recipient" tabindex="-1" aria-labelledby="recipient-title">
        <p>You’re buying a gift for…</p>
        <h2 id="recipient-title">{{ recipient }}</h2>
        <p class="secret-note">Let the thoughtful scheming begin. Keep it a secret!</p>
        <button class="secondary" type="button" @click="hide()">Hide name</button>
      </section>

      <div v-if="ready" class="group-details">
        <div><span class="detail-label">GIFT BUDGET</span><p>{{ details.budget }}</p></div>
        <p class="group-rules">{{ details.message }}</p>
      </div>
      <p class="footer-note"><span aria-hidden="true">✧</span> The best part is making someone smile.</p>
    </section>
    <p class="page-footer">Made for giving. Wrapped in <RouterLink to="/admin">secrecy</RouterLink>.</p>
  </main>
</template>
