<script setup lang="ts">
defineProps<{
  title: string
  description: string
  retryLabel: string
  retrying?: boolean
}>()

defineEmits<{
  retry: []
}>()
</script>

<template>
  <section
    class="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center"
    role="alert"
    aria-live="assertive"
  >
    <div
      class="mx-auto flex size-12 items-center justify-center rounded-full bg-white text-xl text-rose-700 shadow-sm"
      aria-hidden="true"
    >
      <i class="pi pi-exclamation-triangle" />
    </div>

    <h2 class="mt-4 text-lg font-semibold text-rose-950">{{ title }}</h2>
    <p class="mt-2 text-sm leading-6 text-rose-800">{{ description }}</p>

    <button
      type="button"
      class="mt-5 min-h-touch rounded-xl bg-rose-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="retrying"
      @click="$emit('retry')"
    >
      <i
        class="mr-2"
        :class="retrying ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'"
        aria-hidden="true"
      />
      {{ retryLabel }}
    </button>
  </section>
</template>
