<script setup lang="ts">
import { useI18n } from "vue-i18n"

import type { ToolCapability } from "@/domain/courseHome/types"

defineProps<{
  capability: ToolCapability
}>()

const { t } = useI18n()
</script>

<template>
  <RouterLink
    :to="capability.route"
    class="hover:border-chamilo-300 group flex min-h-touch items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition hover:shadow focus:outline-none focus:ring-2 focus:ring-chamilo-600 focus:ring-offset-2"
  >
    <span
      class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-chamilo-50 text-lg text-chamilo-700"
      aria-hidden="true"
    >
      <i :class="capability.icon" />
    </span>

    <span class="min-w-0 flex-1">
      <span class="flex flex-wrap items-center gap-2">
        <span class="font-semibold text-slate-900">{{ t(capability.titleKey) }}</span>
        <span
          v-if="capability.readOnly"
          class="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-600"
        >
          {{ t("courseHome.readOnly") }}
        </span>
      </span>
      <span class="sr-only">{{ t(capability.descriptionKey) }}</span>
    </span>

    <i
      class="pi pi-chevron-right text-sm text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-chamilo-700"
      aria-hidden="true"
    />
  </RouterLink>
</template>
