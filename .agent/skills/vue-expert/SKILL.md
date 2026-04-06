---
name: vue-expert
description: Vue 3.5+ Composition API. Script setup, reactive refs, computed, watchers, composables, Pinia, Vue Router 4, Nuxt 4. Use when building Vue/Nuxt applications.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 3.1.0
last-updated: 2026-04-06
---

# Vue 3.5+ & Nuxt 4 — Dense Reference

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
import { ref, computed, watch, onMounted } from "vue";

// Props
const props = defineProps<{ title: string; count?: number }>();
// With defaults:
const props = withDefaults(defineProps<{ variant?: "primary" | "secondary" }>(), { variant: "primary" });

// Emits
const emit = defineEmits<{ update: [value: string]; delete: [id: number] }>();

// v-model (Vue 3.4+)
const modelValue = defineModel<string>();          // default model
const count = defineModel<number>("count");         // named model

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
const state = reactive({ name: "Alice", age: 25 });
// ❌ const { name } = state; // loses reactivity
// ✅ const name = computed(() => state.name);

// computed — cached, re-runs only when deps change
const doubled = computed(() => count.value * 2);
const fullName = computed({
  get: () => `${first.value} ${last.value}`,
  set: (v) => { [first.value, last.value] = v.split(" "); },
});

// watch
watch(count, (newVal, oldVal) => {}); // immediate: false by default
watch(() => props.id, fetchUser, { immediate: true });
watchEffect(() => { console.log(count.value); }); // auto-tracks deps
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
    try { data.value = await fn(); }
    catch (e) { error.value = e as Error; }
    finally { loading.value = false; }
  }
  execute();
  return { data, error, loading, refresh: execute };
}
```

---

## Pinia

```ts
// stores/counter.ts
import { defineStore } from "pinia";
export const useCounterStore = defineStore("counter", () => {
  const count = ref(0);                 // Setup Store (preferred)
  const doubled = computed(() => count.value * 2);
  function increment() { count.value++; }
  return { count, doubled, increment };
});

// Usage in component:
const store = useCounterStore();
// ❌ const { count } = store;        // loses reactivity!
// ✅ const count = storeToRefs(store).count;
import { storeToRefs } from "pinia";
const { count } = storeToRefs(store);

// Persist plugin:
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
const pinia = createPinia().use(piniaPluginPersistedstate);
```

---

## Vue Router 4

```ts
// router/index.ts
import { createRouter, createWebHistory } from "vue-router";
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: () => import("./views/Home.vue") }, // lazy-loaded
    { path: "/user/:id", component: UserView, props: true },    // props:true passes params as props
    { path: "/:pathMatch(.*)*", component: NotFound },          // 404 catch-all
  ],
});
// Route guards
router.beforeEach(async (to, from) => {
  if (to.meta.requiresAuth && !isLoggedIn()) return { name: "Login" };
});

// In component:
import { useRouter, useRoute } from "vue-router";
const router = useRouter();
const route = useRoute();
router.push({ name: "User", params: { id: 42 } });
const userId = route.params.id as string;
```

---

## Templates

```vue
<template>
  <!-- v-model -->
  <input v-model="email" />
  <MyInput v-model:title="title" v-model:count="count" />  <!-- named model -->
  
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
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
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
const { id } = useRoute().params;                       // auto-imported
const { data, error, refresh } = await useFetch(`/api/users/${id}`, {
  lazy: false,        // SSR: wait for data before rendering
  server: true,       // fetch on server (default)
  transform: (r) => r.user,
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
