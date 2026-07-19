<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  description: string
}>()
</script>

<template>
  <section
    class="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
    aria-live="polite"
  >
    <div
      class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-chamilo-50 text-2xl text-chamilo-700"
      aria-hidden="true"
    >
      <i :class="icon" />
    </div>

    <h2 class="mt-4 text-xl font-semibold text-slate-900">{{ title }}</h2>
    <p class="mt-2 text-sm leading-6 text-slate-600">{{ description }}</p>

    <slot />
  </section>
</template>
