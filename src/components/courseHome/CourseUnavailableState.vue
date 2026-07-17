<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"

const props = defineProps<{
  kind: "missing" | "denied" | "closed"
}>()

const { t } = useI18n()
const icon = computed(() =>
  props.kind === "missing"
    ? "pi pi-question-circle"
    : props.kind === "denied"
      ? "pi pi-lock"
      : "pi pi-ban",
)
</script>

<template>
  <section
    class="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center"
    role="status"
    aria-live="polite"
  >
    <div
      class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white text-2xl text-amber-700 shadow-sm"
      aria-hidden="true"
    >
      <i :class="icon" />
    </div>

    <h1 class="mt-4 text-xl font-semibold text-amber-950">
      {{ t(`courseHome.states.${kind}.title`) }}
    </h1>
    <p class="mt-2 text-sm leading-6 text-amber-900">
      {{ t(`courseHome.states.${kind}.description`) }}
    </p>

    <RouterLink
      :to="{ name: 'courses' }"
      class="mt-5 inline-flex min-h-touch items-center justify-center rounded-xl bg-amber-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-800 focus:ring-offset-2"
    >
      <i class="pi pi-arrow-left mr-2" aria-hidden="true" />
      {{ t("courseHome.backToCourses") }}
    </RouterLink>
  </section>
</template>
