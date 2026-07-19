<script setup lang="ts">
import { computed, onMounted } from "vue"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import { sanitizeAnnouncementHtml } from "@/domain/announcements/sanitizeAnnouncementHtml"
import {
  buildCourseRoute,
  parseCourseRouteContext,
  CourseRouteContextError,
} from "@/domain/courses/routeContext"
import { useCampusStore } from "@/stores/campus"
import { useCourseDescriptionStore } from "@/stores/courseDescription"

const props = defineProps<{
  courseId: string
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
}>()

const { t } = useI18n()
const campusStore = useCampusStore()
const store = useCourseDescriptionStore()
const { status, snapshot, items, errorCode } = storeToRefs(store)

const context = computed(() => {
  try {
    return parseCourseRouteContext(props)
  } catch (error) {
    if (error instanceof CourseRouteContextError) {
      return null
    }

    throw error
  }
})

const errorDescription = computed(() =>
  t(`courseDescription.errors.${errorCode.value ?? "server"}`),
)

const typeLabels = computed(
  () => new Map(snapshot.value?.types.map((type) => [type.value, type.label]) ?? []),
)

function typeLabel(type: number): string {
  return typeLabels.value.get(type) ?? t("courseDescription.unknownType")
}

function sanitizedContent(content: string): string {
  return sanitizeAnnouncementHtml(
    content,
    campusStore.selectedCampus?.baseUrl ?? "https://invalid.local",
  )
}

async function load(): Promise<void> {
  if (context.value) {
    await store.load(context.value)
  }
}

onMounted(load)
</script>

<template>
  <CourseUnavailableState v-if="!context" kind="missing" />

  <div v-else class="space-y-5">
    <RouterLink
      :to="buildCourseRoute(context)"
      class="inline-flex min-h-touch items-center gap-2 rounded-xl px-2 text-sm font-semibold text-chamilo-700"
    >
      <i class="pi pi-arrow-left" aria-hidden="true" />
      {{ t("courseDescription.backToCourse") }}
    </RouterLink>

    <section class="rounded-2xl bg-white p-4 shadow-sm">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
            {{ t("courseDescription.eyebrow") }}
          </p>
          <h1 class="mt-1 text-xl font-semibold text-slate-900">
            {{ t("courseDescription.title") }}
          </h1>
          <p class="mt-2 text-sm text-slate-600">
            {{ t("courseDescription.description") }}
          </p>
        </div>
        <span
          class="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
        >
          {{ t("courseDescription.readOnly") }}
        </span>
      </div>
    </section>

    <LoadingState
      v-if="status === 'loading' || status === 'idle'"
      :label="t('courseDescription.loading')"
    />

    <ErrorState
      v-else-if="status === 'error'"
      :title="t('courseDescription.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      @retry="load"
    />

    <div v-else-if="items.length" class="space-y-4">
      <article
        v-for="item in items"
        :key="item.iid"
        class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
              {{ typeLabel(item.descriptionType) }}
            </p>
            <h2 class="mt-1 break-words text-lg font-semibold text-slate-900">
              {{ item.title }}
            </h2>
          </div>

          <span
            v-if="item.progress > 0"
            class="rounded-full bg-chamilo-50 px-3 py-1 text-sm font-semibold text-chamilo-700"
          >
            {{ item.progress }}%
          </span>
        </div>

        <!-- Content is sanitized by sanitizeAnnouncementHtml before rendering. -->
        <!-- eslint-disable vue/no-v-html -->
        <div
          v-if="item.content"
          class="course-description-content mt-4 break-words text-sm leading-6 text-slate-700"
          v-html="sanitizedContent(item.content)"
        />
        <!-- eslint-enable vue/no-v-html -->

        <p v-else class="mt-4 text-sm text-slate-500">
          {{ t("courseDescription.noContent") }}
        </p>

        <div class="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
          <span v-if="item.isInheritedFromCourse" class="rounded-full bg-slate-100 px-3 py-1">
            {{ t("courseDescription.inherited") }}
          </span>
          <span v-if="item.language" class="rounded-full bg-slate-100 px-3 py-1">
            {{ item.language }}
          </span>
        </div>
      </article>
    </div>

    <EmptyState
      v-else
      :title="t('courseDescription.emptyTitle')"
      :description="t('courseDescription.emptyDescription')"
    />
  </div>
</template>

<style scoped>
.course-description-content :deep(p),
.course-description-content :deep(ul),
.course-description-content :deep(ol),
.course-description-content :deep(blockquote),
.course-description-content :deep(pre),
.course-description-content :deep(table) {
  margin-top: 0.75rem;
}

.course-description-content :deep(ul),
.course-description-content :deep(ol) {
  padding-left: 1.25rem;
}

.course-description-content :deep(ul) {
  list-style: disc;
}

.course-description-content :deep(ol) {
  list-style: decimal;
}

.course-description-content :deep(a) {
  color: rgb(3 105 161);
  font-weight: 600;
  text-decoration: underline;
}

.course-description-content :deep(img) {
  height: auto;
  max-width: 100%;
  border-radius: 0.75rem;
}

.course-description-content :deep(table) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
}

.course-description-content :deep(th),
.course-description-content :deep(td) {
  border: 1px solid rgb(203 213 225);
  padding: 0.5rem;
  text-align: left;
}
</style>
