<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
    <div class="mx-auto flex min-h-16 max-w-screen-sm items-center gap-3 px-4">
      <div
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
