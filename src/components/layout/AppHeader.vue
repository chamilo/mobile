<script setup lang="ts">
import { computed, ref, watch } from "vue"

const props = withDefaults(
  defineProps<{
    brandName: string
    title: string
    logoUrl: string | null
    logoAlt: string
    showMenuButton?: boolean
    menuLabel?: string
  }>(),
  {
    showMenuButton: false,
    menuLabel: "Open menu",
  },
)

const emit = defineEmits<{
  menu: []
}>()

const imageFailed = ref(false)
const showLogo = computed(() => Boolean(props.logoUrl) && !imageFailed.value)

watch(
  () => props.logoUrl,
  () => {
    imageFailed.value = false
  },
)

function handleLogoError(): void {
  imageFailed.value = true
}
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
    <div class="mx-auto flex min-h-16 max-w-screen-sm items-center gap-3 px-4">
      <button
        v-if="showMenuButton"
        type="button"
        class="flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-chamilo-600"
        :aria-label="menuLabel"
        aria-controls="app-navigation-drawer"
        @click="emit('menu')"
      >
        <i class="pi pi-bars text-lg" aria-hidden="true" />
      </button>

      <div
        v-if="showLogo"
        class="flex h-10 min-w-10 max-w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white px-1 ring-1 ring-slate-200"
      >
        <img
          :src="logoUrl ?? undefined"
          :alt="logoAlt"
          class="max-h-8 max-w-20 object-contain"
          decoding="async"
          fetchpriority="high"
          @error="handleLogoError"
        />
      </div>

      <div
        v-else
        data-testid="brand-fallback"
        class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-chamilo-700 text-sm font-bold text-white"
        aria-hidden="true"
      >
        CH
      </div>

      <div class="min-w-0">
        <p class="truncate text-xs font-medium uppercase tracking-wide text-chamilo-700">
          {{ brandName }}
        </p>
        <h1 class="truncate text-lg font-semibold text-slate-900">{{ title }}</h1>
      </div>
    </div>
  </header>
</template>
