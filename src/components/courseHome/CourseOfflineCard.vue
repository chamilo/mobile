<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useI18n } from "vue-i18n"

import type { CourseHomeEntry } from "@/domain/courseHome/types"
import { buildCourseOfflineSetupRoute } from "@/domain/courses/routeContext"
import { useOfflineCoursePacksStore } from "@/stores/offlineCoursePacks"

const props = defineProps<{
  entry: CourseHomeEntry
}>()

const { t } = useI18n()
const packsStore = useOfflineCoursePacksStore()
const manifest = computed(() => packsStore.manifestFor(props.entry))

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`

  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

onMounted(() => void packsStore.refresh())
</script>

<template>
  <section
    class="rounded-2xl border p-4"
    :class="manifest ? 'border-emerald-200 bg-emerald-50' : 'border-chamilo-200 bg-chamilo-50'"
    aria-labelledby="course-offline-title"
  >
    <div class="flex items-start gap-3">
      <span
        class="flex size-11 shrink-0 items-center justify-center rounded-xl"
        :class="manifest ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-chamilo-700'"
      >
        <i :class="manifest ? 'pi pi-check-circle' : 'pi pi-cloud-download'" aria-hidden="true" />
      </span>
      <div class="min-w-0 flex-1">
        <p
          class="text-xs font-semibold uppercase tracking-wide"
          :class="manifest ? 'text-emerald-700' : 'text-chamilo-700'"
        >
          {{
            manifest
              ? t(`offlineCourse.status.${manifest.status}`)
              : t("offlineCourse.notDownloaded")
          }}
        </p>
        <h2 id="course-offline-title" class="mt-1 font-semibold text-slate-900">
          {{ t("offlineCourse.courseCardTitle") }}
        </h2>
        <p class="mt-1 text-sm leading-5 text-slate-600">
          <template v-if="manifest">
            {{
              t("offlineCourse.courseCardReady", {
                resources: manifest.resourceCount,
                size: formatBytes(manifest.downloadedBytes),
              })
            }}
          </template>
          <template v-else>
            {{ t("offlineCourse.courseCardDescription") }}
          </template>
        </p>
      </div>
    </div>

    <RouterLink
      :to="buildCourseOfflineSetupRoute(entry.context)"
      class="mt-4 flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-chamilo-700 px-4 py-3 font-semibold text-white"
    >
      <i class="pi pi-download" aria-hidden="true" />
      {{ manifest ? t("offlineCourse.manage") : t("offlineCourse.makeAvailable") }}
    </RouterLink>
  </section>
</template>
