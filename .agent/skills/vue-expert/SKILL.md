---
name: vue-expert
description: Vue 3.5+ Composition API mastery. Script setup, reactive refs, computed, watchers, composables, Pinia stores, Vue Router 4, Nuxt 4, Teleport, Transition, provide/inject, TypeScript integration, performance optimization, and testing with Vitest. Use when building Vue applications, designing composables, managing state, or implementing Nuxt patterns.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-03-30
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Vue Expert — Vue 3.5+ & Nuxt 4 Mastery

> Vue 3.5 is Composition API everywhere. Options API is legacy. Vuex is dead. Pinia is the standard.
> Every component uses `<script setup>`. Every store uses Pinia. Every composable returns refs. No exceptions.

---

## Script Setup (Mandatory)

```vue
<script setup lang="ts">
// <script setup> is the ONLY way to write Vue 3.5+ components
// It compiles to a render function with zero boilerplate

import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";

// Props
const props = defineProps<{
  title: string;
  count?: number;
  items: string[];
}>();

// Props with defaults
const props = withDefaults(defineProps<{
  title: string;
  variant?: "primary" | "secondary";
  size?: number;
}>(), {
  variant: "primary",
  size: 16,
});

// Emits (typed)
const emit = defineEmits<{
  update: [value: string];
  delete: [id: number];
  "item-click": [item: Item, index: number];
}>();

// Expose (for parent ref access)
defineExpose({
  reset: () => { /* ... */ },
  focus: () => { /* ... */ },
});

// Models (Vue 3.4+ — replaces v-model boilerplate)
const modelValue = defineModel<string>(); // default v-model
const count = defineModel<number>("count"); // named v-model

// ❌ HALLUCINATION TRAP: defineModel was added in Vue 3.4+
// Before 3.4, v-model required manual prop + emit boilerplate
// ❌ HALLUCINATION TRAP: Do NOT use defineComponent() with <script setup>
// <script setup> IS the setup function — defineComponent is redundant
</script>
```

### Options API vs Composition API

```vue
<!-- ❌ LEGACY — Options API (Vue 2 pattern) -->
<script>
export default {
  data() { return { count: 0 } },
  computed: { doubled() { return this.count * 2 } },
  methods: { increment() { this.count++ } },
  mounted() { console.log("mounted") },
}
</script>

<!-- ✅ MODERN — Composition API with <script setup> -->
<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

const count = ref(0);
const doubled = computed(() => count.value * 2);
function increment() { count.value++; }
onMounted(() => console.log("mounted"));
</script>

<!-- ❌ HALLUCINATION TRAP: Never generate Options API in Vue 3.5+ projects
     unless explicitly maintaining legacy code -->
```

---

## Reactivity System

### ref vs reactive

```ts
import { ref, reactive, toRefs, toRef } from "vue";

// ref — single value (primitive or object)
const count = ref(0);
count.value++;  // must use .value in <script>
// In <template>, .value is auto-unwrapped: {{ count }}

// reactive — object (deep reactive)
const state = reactive({
  user: { name: "Alice", age: 30 },
  items: ["a", "b", "c"],
});
state.user.name = "Bob"; // direct mutation (no .value needed)

// ❌ HALLUCINATION TRAP: Destructuring reactive LOSES reactivity
const { name, age } = state.user; // ❌ name and age are NOT reactive

// ✅ Fix: use toRefs
const { name, age } = toRefs(state.user); // name.value and age.value ARE reactive

// ✅ Fix: use toRef for a single property
const name = toRef(state.user, "name");

// RULE: Prefer ref() for everything. Use reactive() only for complex nested state.
// ref() is more predictable — .value makes reactivity explicit.
```

### Computed

```ts
import { ref, computed } from "vue";

const items = ref<Item[]>([]);
const searchQuery = ref("");

// Read-only computed
const filteredItems = computed(() =>
  items.value.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
);

// Writable computed
const fullName = computed({
  get: () => `${firstName.value} ${lastName.value}`,
  set: (val: string) => {
    const [first, ...rest] = val.split(" ");
    firstName.value = first;
    lastName.value = rest.join(" ");
  },
});
```

### Watchers

```ts
import { ref, watch, watchEffect, watchPostEffect } from "vue";

const query = ref("");
const userId = ref(1);

// watch — explicit sources, previous value available
watch(query, (newVal, oldVal) => {
  console.log(`Query changed: ${oldVal} → ${newVal}`);
  fetchResults(newVal);
});

// Watch multiple sources
watch([query, userId], ([newQuery, newId], [oldQuery, oldId]) => {
  console.log("Query or userId changed");
});

// Deep watch (for objects/arrays)
watch(
  () => state.user,
  (newUser) => { console.log("User changed:", newUser); },
  { deep: true }
);

// Immediate watch (runs on mount)
watch(userId, (id) => fetchUser(id), { immediate: true });

// watchEffect — auto-tracks dependencies
watchEffect(async () => {
  // Automatically re-runs when query.value or userId.value changes
  const data = await fetch(`/api/search?q=${query.value}&user=${userId.value}`);
  results.value = await data.json();
});

// watchPostEffect — runs after DOM update (replaces watchEffect with flush: 'post')
watchPostEffect(() => {
  // Safe to access updated DOM here
  scrollToBottom(container.value);
});

// Cleanup (prevent stale async results)
watchEffect((onCleanup) => {
  const controller = new AbortController();
  onCleanup(() => controller.abort());

  fetch(`/api/data?q=${query.value}`, { signal: controller.signal })
    .then((res) => res.json())
    .then((data) => { results.value = data; });
});
```

---

## Composables (Custom Hooks)

```ts
// composables/useFetch.ts
import { ref, watchEffect, type Ref } from "vue";

interface UseFetchReturn<T> {
  data: Ref<T | null>;
  error: Ref<Error | null>;
  isLoading: Ref<boolean>;
  refresh: () => Promise<void>;
}

export function useFetch<T>(url: Ref<string> | string): UseFetchReturn<T> {
  const data = ref<T | null>(null) as Ref<T | null>;
  const error = ref<Error | null>(null);
  const isLoading = ref(false);

  async function fetchData() {
    isLoading.value = true;
    error.value = null;

    try {
      const resolvedUrl = typeof url === "string" ? url : url.value;
      const response = await fetch(resolvedUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      data.value = await response.json();
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
    } finally {
      isLoading.value = false;
    }
  }

  // Auto-refetch when URL changes (if URL is a ref)
  if (typeof url !== "string") {
    watchEffect(() => {
      if (url.value) fetchData();
    });
  } else {
    fetchData();
  }

  return { data, error, isLoading, refresh: fetchData };
}

// Usage:
const apiUrl = computed(() => `/api/users/${userId.value}`);
const { data: user, isLoading, error } = useFetch<User>(apiUrl);
```

### useLocalStorage Composable

```ts
// composables/useLocalStorage.ts
import { ref, watch, type Ref } from "vue";

export function useLocalStorage<T>(key: string, defaultValue: T): Ref<T> {
  const stored = localStorage.getItem(key);
  const data = ref<T>(stored ? JSON.parse(stored) : defaultValue) as Ref<T>;

  watch(data, (newVal) => {
    localStorage.setItem(key, JSON.stringify(newVal));
  }, { deep: true });

  return data;
}

// Usage:
const theme = useLocalStorage("theme", "dark");
theme.value = "light"; // auto-saves to localStorage
```

### useDebounce Composable

```ts
// composables/useDebounce.ts
import { ref, watch, type Ref } from "vue";

export function useDebounce<T>(source: Ref<T>, delay = 300): Ref<T> {
  const debounced = ref(source.value) as Ref<T>;

  let timeout: ReturnType<typeof setTimeout>;
  watch(source, (val) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => { debounced.value = val; }, delay);
  });

  return debounced;
}

// Usage:
const query = ref("");
const debouncedQuery = useDebounce(query, 500);
// debouncedQuery only updates 500ms after the user stops typing
```

---

## Pinia (State Management)

### Setup Store (Recommended)

```ts
// stores/cart.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";

export const useCartStore = defineStore("cart", () => {
  // State
  const items = ref<CartItem[]>([]);

  // Getters (computed)
  const totalItems = computed(() => items.value.length);
  const totalPrice = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
  const isEmpty = computed(() => items.value.length === 0);

  // Actions
  function addItem(product: Product, quantity = 1) {
    const existing = items.value.find((i) => i.productId === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      items.value.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
      });
    }
  }

  function removeItem(productId: string) {
    items.value = items.value.filter((i) => i.productId !== productId);
  }

  function clearCart() {
    items.value = [];
  }

  // Async action
  async function checkout() {
    const response = await fetch("/api/checkout", {
      method: "POST",
      body: JSON.stringify({ items: items.value }),
    });
    if (response.ok) clearCart();
    return response.json();
  }

  return { items, totalItems, totalPrice, isEmpty, addItem, removeItem, clearCart, checkout };
});

// ❌ HALLUCINATION TRAP: Do NOT use Vuex in Vue 3.5+ projects
// Vuex is in maintenance mode. Pinia is the official replacement.
// ❌ import { createStore } from "vuex"  ← LEGACY
// ✅ import { defineStore } from "pinia"
```

### Using Stores in Components

```vue
<script setup lang="ts">
import { useCartStore } from "@/stores/cart";
import { storeToRefs } from "pinia";

const cartStore = useCartStore();

// ✅ Use storeToRefs for reactive destructuring of state/getters
const { items, totalPrice, isEmpty } = storeToRefs(cartStore);

// Actions can be destructured directly (they're not reactive)
const { addItem, removeItem, clearCart } = cartStore;

// ❌ HALLUCINATION TRAP: Destructuring state WITHOUT storeToRefs loses reactivity
// ❌ const { items, totalPrice } = cartStore;  ← NOT reactive!
// ✅ const { items, totalPrice } = storeToRefs(cartStore);  ← reactive
</script>

<template>
  <div v-if="isEmpty">Cart is empty</div>
  <ul v-else>
    <li v-for="item in items" :key="item.productId">
      {{ item.name }} — ${{ item.price }} × {{ item.quantity }}
      <button @click="removeItem(item.productId)">Remove</button>
    </li>
  </ul>
  <p>Total: ${{ totalPrice.toFixed(2) }}</p>
</template>
```

### Pinia Persistence Plugin

```ts
// main.ts
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

// In store:
export const useSettingsStore = defineStore("settings", () => {
  const theme = ref("dark");
  const locale = ref("en");
  return { theme, locale };
}, {
  persist: true, // auto-saves to localStorage
});
```

---

## Vue Router 4

### Route Configuration

```ts
// router/index.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: () => import("@/layouts/DefaultLayout.vue"),
    children: [
      { path: "", name: "home", component: () => import("@/pages/Home.vue") },
      { path: "about", name: "about", component: () => import("@/pages/About.vue") },
    ],
  },
  {
    path: "/dashboard",
    component: () => import("@/layouts/DashboardLayout.vue"),
    meta: { requiresAuth: true },
    children: [
      { path: "", name: "dashboard", component: () => import("@/pages/Dashboard.vue") },
      {
        path: "users/:id",
        name: "user-detail",
        component: () => import("@/pages/UserDetail.vue"),
        props: true, // pass route params as props
      },
    ],
  },
  { path: "/:pathMatch(.*)*", name: "not-found", component: () => import("@/pages/NotFound.vue") },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 };
  },
});

// Navigation guard
router.beforeEach(async (to, from) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
});

export default router;
```

### Router Composables

```vue
<script setup lang="ts">
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();

// Reactive route params
const userId = computed(() => route.params.id as string);

// Programmatic navigation
function goToUser(id: string) {
  router.push({ name: "user-detail", params: { id } });
}

function goBack() {
  router.back();
}

// ❌ HALLUCINATION TRAP: route.params values are always strings
// Even if the URL is /users/123, params.id is "123" (string), not 123 (number)
// Always parse: parseInt(route.params.id as string)
</script>
```

---

## Component Patterns

### Slots

```vue
<!-- BaseCard.vue -->
<template>
  <div class="card">
    <header v-if="$slots.header" class="card-header">
      <slot name="header" />
    </header>

    <div class="card-body">
      <slot />  <!-- default slot -->
    </div>

    <footer v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<!-- Scoped slot (pass data to parent) -->
<!-- DataList.vue -->
<template>
  <ul>
    <li v-for="(item, index) in items" :key="item.id">
      <slot name="item" :item="item" :index="index" :is-last="index === items.length - 1">
        <!-- Default content if parent doesn't provide slot -->
        {{ item.name }}
      </slot>
    </li>
  </ul>
</template>

<!-- Usage with scoped slot -->
<DataList :items="users">
  <template #item="{ item, index, isLast }">
    <UserCard :user="item" :highlighted="index === 0" />
    <hr v-if="!isLast" />
  </template>
</DataList>
```

### Provide / Inject (Dependency Injection)

```ts
// Parent component
import { provide, ref, type InjectionKey } from "vue";

interface ThemeContext {
  theme: Ref<string>;
  toggleTheme: () => void;
}

export const ThemeKey: InjectionKey<ThemeContext> = Symbol("theme");

// In parent <script setup>:
const theme = ref("dark");
function toggleTheme() {
  theme.value = theme.value === "dark" ? "light" : "dark";
}
provide(ThemeKey, { theme, toggleTheme });

// Child component (any depth)
import { inject } from "vue";
import { ThemeKey } from "@/keys";

const themeCtx = inject(ThemeKey);
if (!themeCtx) throw new Error("ThemeKey not provided");
// themeCtx.theme.value === "dark"

// ❌ HALLUCINATION TRAP: Always use InjectionKey<T> for type safety
// inject("theme") returns unknown — inject(ThemeKey) returns ThemeContext
```

### Teleport

```vue
<!-- Render modal content at <body> level to escape overflow/z-index traps -->
<Teleport to="body">
  <div v-if="showModal" class="modal-overlay">
    <div class="modal-content">
      <slot />
      <button @click="$emit('close')">Close</button>
    </div>
  </div>
</Teleport>
```

### Transition

```vue
<Transition
  name="fade"
  mode="out-in"
  @before-enter="onBeforeEnter"
  @enter="onEnter"
  @leave="onLeave"
>
  <component :is="currentComponent" :key="currentRoute" />
</Transition>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>

<!-- TransitionGroup for lists -->
<TransitionGroup name="list" tag="ul">
  <li v-for="item in items" :key="item.id">
    {{ item.name }}
  </li>
</TransitionGroup>

<style>
.list-enter-active, .list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from, .list-leave-from {
  opacity: 0;
  transform: translateY(20px);
}
.list-leave-active {
  position: absolute; /* prevents layout shift during leave */
}
</style>
```

---

## Nuxt 4

### File-Based Routing

```
pages/
├── index.vue           → /
├── about.vue           → /about
├── users/
│   ├── index.vue       → /users
│   └── [id].vue        → /users/:id
├── blog/
│   └── [...slug].vue   → /blog/* (catch-all)
└── [[optional]].vue    → /:optional? (optional param)
```

### Data Fetching

```vue
<script setup lang="ts">
// useFetch — SSR-friendly, auto-cached, deduped
const { data: users, status, error, refresh } = await useFetch<User[]>("/api/users", {
  query: { page: currentPage },  // reactive query params
  pick: ["id", "name", "email"], // only extract these fields (reduces payload)
  transform: (data) => data.filter((u) => u.isActive), // client-side transform
  watch: [currentPage],          // auto-refetch when page changes
});

// useAsyncData — for non-fetch async operations
const { data: config } = await useAsyncData("app-config", () => {
  return $fetch("/api/config");
});

// $fetch — raw fetch (NOT SSR-cached, no dedup)
const data = await $fetch("/api/endpoint");

// ❌ HALLUCINATION TRAP: useFetch auto-deduplicates during SSR
// Calling useFetch twice with the same key returns the same promise
// Use $fetch when you intentionally want separate requests

// ❌ HALLUCINATION TRAP: useFetch MUST be called at the top level of setup
// It cannot be called inside functions, loops, or conditionals
</script>

<template>
  <div v-if="status === 'pending'">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <ul v-else>
    <li v-for="user in users" :key="user.id">{{ user.name }}</li>
  </ul>
</template>
```

### Runtime Config

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    // Server-only (never exposed to client)
    apiSecret: process.env.API_SECRET,
    dbUrl: process.env.DATABASE_URL,

    // Client-accessible
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "https://api.example.com",
      appName: "My App",
    },
  },
});

// Usage in components/composables:
const config = useRuntimeConfig();
// config.public.apiBase    — ✅ accessible on client and server
// config.apiSecret          — ✅ accessible on server only, undefined on client

// ❌ HALLUCINATION TRAP: Private keys are ONLY available server-side
// Accessing config.apiSecret in a client component returns undefined
```

### Server Routes (Nitro)

```ts
// server/api/users.get.ts — responds to GET /api/users
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const users = await db.user.findMany({
    skip: Number(query.offset) || 0,
    take: Number(query.limit) || 20,
  });
  return users;
});

// server/api/users.post.ts — responds to POST /api/users
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  // Validate body...
  const user = await db.user.create({ data: body });
  return user;
});

// server/api/users/[id].get.ts — responds to GET /api/users/:id
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const user = await db.user.findUnique({ where: { id } });
  if (!user) {
    throw createError({ statusCode: 404, message: "User not found" });
  }
  return user;
});
```

---

## TypeScript Integration

```vue
<script setup lang="ts">
// Component with full TypeScript
interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user" | "moderator";
}

const props = defineProps<{
  user: User;
  editable?: boolean;
}>();

const emit = defineEmits<{
  save: [user: User];
  cancel: [];
}>();

// Template refs
const inputRef = ref<HTMLInputElement | null>(null);
const formRef = ref<InstanceType<typeof FormComponent> | null>(null);

onMounted(() => {
  inputRef.value?.focus();
});
</script>
```

---

## Performance Optimization

```vue
<script setup lang="ts">
import { shallowRef, shallowReactive, triggerRef } from "vue";

// shallowRef — only tracks .value changes, not deep mutations
const bigList = shallowRef<Item[]>([]);
// Mutating items inside won't trigger updates
// Must replace the entire array: bigList.value = [...newItems]
// Or manually trigger: triggerRef(bigList)

// v-once — render once, never update (static content)
// v-memo — skip re-rendering unless dependencies change
</script>

<template>
  <!-- Static content — rendered once -->
  <footer v-once>
    <p>© 2024 My Company. All rights reserved.</p>
  </footer>

  <!-- v-memo — skip re-render unless item.id or selected changes -->
  <div v-for="item in list" :key="item.id" v-memo="[item.id, selected === item.id]">
    <ItemCard :item="item" :selected="selected === item.id" />
  </div>

  <!-- Async components (lazy loading) -->
  <component :is="defineAsyncComponent(() => import('./HeavyWidget.vue'))" />
</template>
```

---

## Testing with Vitest

```ts
// tests/components/Counter.test.ts
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Counter from "@/components/Counter.vue";

describe("Counter", () => {
  it("renders initial count", () => {
    const wrapper = mount(Counter, { props: { initial: 5 } });
    expect(wrapper.text()).toContain("5");
  });

  it("increments on click", async () => {
    const wrapper = mount(Counter);
    await wrapper.find("button").trigger("click");
    expect(wrapper.text()).toContain("1");
  });

  it("emits update event", async () => {
    const wrapper = mount(Counter);
    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("update")).toHaveLength(1);
    expect(wrapper.emitted("update")![0]).toEqual([1]);
  });
});

// Testing composables
import { useDebounce } from "@/composables/useDebounce";

describe("useDebounce", () => {
  it("debounces value updates", async () => {
    vi.useFakeTimers();
    const source = ref("hello");
    const debounced = useDebounce(source, 300);

    source.value = "world";
    expect(debounced.value).toBe("hello"); // not yet

    vi.advanceTimersByTime(300);
    expect(debounced.value).toBe("world"); // now updated

    vi.useRealTimers();
  });
});

// Testing Pinia stores
import { setActivePinia, createPinia } from "pinia";
import { useCartStore } from "@/stores/cart";

describe("Cart Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("adds items", () => {
    const cart = useCartStore();
    cart.addItem({ id: "1", name: "Widget", price: 10 });
    expect(cart.totalItems).toBe(1);
    expect(cart.totalPrice).toBe(10);
  });
});
```

---

## Output Format

When this skill produces or reviews code, structure your output as follows:

```
━━━ Vue Expert Report ━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       Vue Expert
Vue Ver:     3.5+
Scope:       [N files · N components]
─────────────────────────────────────────────────
✅ Passed:   [checks that passed, or "All clean"]
⚠️  Warnings: [non-blocking issues, or "None"]
❌ Blocked:  [blocking issues requiring fix, or "None"]
─────────────────────────────────────────────────
VBC status:  PENDING → VERIFIED
Evidence:    [test output / lint pass / compile success]
```

**VBC (Verification-Before-Completion) is mandatory.**
Do not mark status as VERIFIED until concrete terminal evidence is provided.

---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when generating Vue code. These are strictly forbidden:

1. **Options API in Vue 3.5+:** Never generate `export default { data(), methods, computed, mounted() }` in modern Vue projects. Always use `<script setup>` with Composition API.
2. **Vuex Instead of Pinia:** Vuex is in maintenance mode. Never import from `vuex`. Use `pinia` with `defineStore()`.
3. **Destructuring Reactive Without `toRefs`/`storeToRefs`:** Destructuring a `reactive()` object or a Pinia store without `toRefs()`/`storeToRefs()` breaks reactivity.
4. **Mutating Props Directly:** Never mutate a prop value. Use `defineEmits` to emit updates, or use `defineModel()` (Vue 3.4+) for v-model bindings.
5. **Using `v-for` Without `:key`:** Every `v-for` must have a unique, stable `:key` binding. Never use the iteration index as the key if the list can reorder.
6. **`defineComponent` With `<script setup>`:** `defineComponent()` is redundant inside `<script setup>`. The setup syntax IS the component definition.
7. **`this` in Composition API:** There is no `this` in `<script setup>`. Access reactive state directly by variable name. `this.count` does not exist.
8. **`useFetch` Inside Functions:** Nuxt's `useFetch` must be called at the top level of `<script setup>`, not inside callbacks, conditionals, or loops.
9. **Route Params as Numbers:** `route.params.id` is always a string. Never treat it as a number without explicit parsing (`parseInt()`).
10. **Exposing Private Runtime Config:** `runtimeConfig` (non-public) keys are server-only. Accessing them in client components returns `undefined`.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/tribunal-frontend`**
**Active reviewers: `logic` · `security` · `frontend` · `type-safety`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting Vue version, Nuxt vs vanilla Vue, or Pinia vs Vuex constraints.
4. **Sloppy Layout Generation:** Never build UI without explicit 4px grid spacing and flex/grid layouts.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming output:
```
✅ Did I use <script setup lang="ts"> (not Options API)?
✅ Did I use Pinia (not Vuex)?
✅ Did I use storeToRefs for reactive store destructuring?
✅ Did I use defineModel (Vue 3.4+) for v-model bindings?
✅ Did I use toRefs when destructuring reactive objects?
✅ Does every v-for have a unique, stable :key?
✅ Did I use useRuntimeConfig for env variables (not process.env)?
✅ Did I call useFetch at the top level of setup?
✅ Are route params parsed correctly (string → number)?
✅ Did I write Vitest tests with @vue/test-utils?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a Vue component "works" because it compiles without errors.
- ✅ **Required:** You are explicitly forbidden from completing your task without providing **concrete terminal/test evidence** (e.g., passing Vitest logs, successful build, or dev server confirmation) proving the component works correctly.
