<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <section
    class="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center"
    aria-live="polite"
  >
    <div
      class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-500"
      aria-hidden="true"
    >
      <i class="pi pi-book" />
    </div>
    <h2 class="mt-4 text-lg font-semibold text-slate-900">{{ title }}</h2>
    <p class="mt-2 text-sm leading-6 text-slate-600">{{ description }}</p>
  </section>
</template>
