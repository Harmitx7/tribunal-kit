---
name: vue-expert
description: Use when Vue 3.5+ Composition API. Script setup, reactive refs, computed, watchers, composables, Pinia, Vue Router 4, Nuxt 4. Use when building Vue/Nuxt applications.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - baseline-ui
  - better-ui
  - 60fps-animation
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Vue 3.5+ & Nuxt 4 — Dense Reference

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `vue-expert` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Vue 3.5+ Composition API. Script setup, reactive refs, computed, watchers, composables, Pinia, Vue Router 4, Nuxt 4. Use when building Vue/Nuxt applications.
- **DO NOT activate when:** The task falls outside the `vue-expert` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---


## Hallucination Traps (Read First)

- ❌ Options API (`data()`, `methods:`, `computed:`) → ✅ `<script setup lang="ts">`
- ❌ `defineComponent()` with `<script setup>` → ✅ redundant, skip it
- ❌ `defineModel` in Vue < 3.4 → ✅ added in 3.4+
- ❌ `ref.value` in template → ✅ auto-unwrapped in template (no `.value`)
- ❌ `reactive()` for primitives → ✅ use `ref()` — `reactive()` breaks on reassign
- ❌ `watch(state.count, ...)` (primitive) → ✅ `watch(() => state.count, ...)`
- ❌ `onBeforeMount` for data fetch → ✅ use `await` directly in `<script setup>` + `<Suspense>`
- ❌ Pinia `this.$store` → ✅ `useStore()` from `pinia`
- ❌ `useRoute()` / `useRouter()` outside setup → ✅ only works inside `<script setup>` or composables

---

## `<script setup>` — The Only Way

```vue
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';

// Props
const props = defineProps<{ title: string; count?: number }>();
// With defaults:
const props = withDefaults(defineProps<{ variant?: 'primary' | 'secondary' }>(), {
  variant: 'primary',
});

// Emits
const emit = defineEmits<{ update: [value: string]; delete: [id: number] }>();

// v-model (Vue 3.4+)
const modelValue = defineModel<string>(); // default model
const count = defineModel<number>('count'); // named model

// Expose to parent ref
defineExpose({ reset: () => {}, focus: () => {} });
</script>
```

---

## Reactivity

```ts
// ref — for primitives and objects (access via .value in JS, auto-unwrap in template)
const count = ref(0);
count.value++;

// reactive — for objects (loses reactivity on reassign/destructure)
const state = reactive({ name: 'Alice', age: 25 });
// ❌ const { name } = state; // loses reactivity
// ✅ const name = computed(() => state.name);

// computed — cached, re-runs only when deps change
const doubled = computed(() => count.value * 2);
const fullName = computed({
  get: () => `${first.value} ${last.value}`,
  set: v => {
    [first.value, last.value] = v.split(' ');
  },
});

// watch
watch(count, (newVal, oldVal) => {}); // immediate: false by default
watch(() => props.id, fetchUser, { immediate: true });
watchEffect(() => {
  console.log(count.value);
}); // auto-tracks deps
```

---

## Composables (Custom Hooks)

```ts
// useCounter.ts
export function useCounter(initial = 0) {
  const count = ref(initial);
  const increment = () => count.value++;
  const reset = () => (count.value = initial);
  return { count: readonly(count), increment, reset };
}

// useAsyncData.ts
export function useAsyncData<T>(fn: () => Promise<T>) {
  const data = ref<T | null>(null);
  const error = ref<Error | null>(null);
  const loading = ref(false);
  async function execute() {
    loading.value = true;
    try {
      data.value = await fn();
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  }
  execute();
  return { data, error, loading, refresh: execute };
}
```

---

## Pinia

```ts
// stores/counter.ts
import { defineStore } from 'pinia';
export const useCounterStore = defineStore('counter', () => {
  const count = ref(0); // Setup Store (preferred)
  const doubled = computed(() => count.value * 2);
  function increment() {
    count.value++;
  }
  return { count, doubled, increment };
});

// Usage in component:
const store = useCounterStore();
// ❌ const { count } = store;        // loses reactivity!
// ✅ const count = storeToRefs(store).count;
import { storeToRefs } from 'pinia';
const { count } = storeToRefs(store);

// Persist plugin:
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
const pinia = createPinia().use(piniaPluginPersistedstate);
```

---

## Vue Router 4

```ts
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./views/Home.vue') }, // lazy-loaded
    { path: '/user/:id', component: UserView, props: true }, // props:true passes params as props
    { path: '/:pathMatch(.*)*', component: NotFound }, // 404 catch-all
  ],
});
// Route guards
router.beforeEach(async (to, from) => {
  if (to.meta.requiresAuth && !isLoggedIn()) return { name: 'Login' };
});

// In component:
import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();
router.push({ name: 'User', params: { id: 42 } });
const userId = route.params.id as string;
```

---

## Templates

```vue
<template>
  <!-- v-model -->
  <input v-model="email" />
  <MyInput v-model:title="title" v-model:count="count" />
  <!-- named model -->

  <!-- v-for with key (ALWAYS set key) -->
  <li v-for="item in items" :key="item.id">{{ item.name }}</li>

  <!-- Dynamic components -->
  <component :is="currentTab" />

  <!-- Teleport — render in a different DOM node -->
  <Teleport to="body"><Modal v-if="showModal" /></Teleport>

  <!-- Transition -->
  <Transition name="fade" mode="out-in">
    <component :is="view" :key="view" />
  </Transition>

  <!-- Suspense (async components / composables with await) -->
  <Suspense><AsyncComponent /><template #fallback>Loading...</template></Suspense>
</template>

<style>
/* Transition CSS */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

---

## Nuxt 4

```
auto-imports:    ref, computed, useRoute, useFetch — no imports needed
composables/:    auto-imported by filename
server/api/:     server routes (GET/POST)
pages/:          file-based routing
layouts/:        layout components
middleware/:     route guards
```

```ts
// pages/users/[id].vue
const { id } = useRoute().params; // auto-imported
const { data, error, refresh } = await useFetch(`/api/users/${id}`, {
  lazy: false, // SSR: wait for data before rendering
  server: true, // fetch on server (default)
  transform: r => r.user,
});
// ❌ TRAP: useFetch in Nuxt ≠ @tanstack/react-query. It's Nuxt-specific.
// ❌ TRAP: useAsyncData key must be UNIQUE per page/component
```

---

## Performance

- ✅ Use `v-memo` for expensive list items that rarely change
- ✅ `defineAsyncComponent(() => import("./Heavy.vue"))` for code splitting
- ✅ `:key` on `<component :is>` forces re-mount on route change (prevents stale state)
- ❌ Avoid deeply nested reactive objects — use `shallowRef`/`shallowReactive` for large data
- ❌ Never mutate props — emit events instead

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Uncontrolled Re-render Loop** | Mutating state inside render bodies or omitting hook dependencies | Wrap effects with explicit deps and isolate reactive derivations in useMemo |
| **Accessibility Neglect** | Interactive <div> without role="button", tabIndex, or onKeyDown | Use semantic <button> or provide ARIA role, keyboard handlers, and focus ring |
| **Layout Shift Flash** | Images/dynamic content without aspect-ratio or explicit dimensions | Enforce aspect-ratio or skeleton placeholders to guarantee zero CLS |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `frontend-reviewer` · `type-safety` · `ui-ux-auditor` · `complexity-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Are all component props strictly typed with zero implicit "any"?
✅ Are responsive breakpoints, fluid typography, and optical balance verified?
✅ Is accessibility (ARIA labels, keyboard focus, contrast) validated?
✅ Are re-renders minimized and state lifecycles cleanly separated?
✅ Did I verify all imported UI components and icon sets actually exist?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
