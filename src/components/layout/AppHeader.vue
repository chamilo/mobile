<script setup lang="ts">
import { computed, ref, watch } from "vue"

const props = defineProps<{
  title: string
  logoUrl: string | null
  logoAlt: string
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
          Chamilo Mobile
        </p>
        <h1 class="truncate text-lg font-semibold text-slate-900">{{ title }}</h1>
      </div>
    </div>
  </header>
</template>
