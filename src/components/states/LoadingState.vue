<script setup lang="ts">
defineProps<{
  label: string
}>()
</script>

<template>
  <section
    class="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
    role="status"
    aria-live="polite"
  >
    <i class="pi pi-spin pi-spinner text-3xl text-chamilo-700" aria-hidden="true" />
    <p class="mt-3 text-sm font-medium text-slate-700">{{ label }}</p>
  </section>
</template>
