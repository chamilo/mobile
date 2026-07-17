<script setup lang="ts">
import { computed } from "vue"
import type { RouteLocationRaw } from "vue-router"
import { useI18n } from "vue-i18n"

import type { AnnouncementSummary } from "@/domain/announcements/types"

const props = defineProps<{
  announcement: AnnouncementSummary
  to: RouteLocationRaw
}>()

const { locale, t } = useI18n()

const dateLabel = computed(() => {
  const value = props.announcement.updatedAt ?? props.announcement.createdAt

  if (!value) {
    return t("announcements.dateUnavailable")
  }

  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
})
</script>

<template>
  <RouterLink
    :to="to"
    class="hover:border-chamilo-300 group block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow focus:outline-none focus:ring-2 focus:ring-chamilo-600 focus:ring-offset-2"
  >
    <div class="flex items-start gap-3">
      <span
        class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-chamilo-50 text-lg text-chamilo-700"
        aria-hidden="true"
      >
        <i class="pi pi-megaphone" />
      </span>

      <div class="min-w-0 flex-1">
        <h2 class="group-hover:text-chamilo-800 font-semibold leading-6 text-slate-900">
          {{ announcement.title }}
        </h2>
        <p class="mt-1 text-sm text-slate-600">
          {{ announcement.author?.fullName || t("announcements.unknownAuthor") }}
        </p>
        <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
          <span class="inline-flex items-center gap-1.5">
            <i class="pi pi-calendar" aria-hidden="true" />
            {{ dateLabel }}
          </span>
          <span v-if="announcement.hasAttachments" class="inline-flex items-center gap-1.5">
            <i class="pi pi-paperclip" aria-hidden="true" />
            {{ t("announcements.attachmentCount", { count: announcement.attachmentCount }) }}
          </span>
        </div>
      </div>

      <i class="pi pi-chevron-right mt-1 text-sm text-slate-400" aria-hidden="true" />
    </div>
  </RouterLink>
</template>
