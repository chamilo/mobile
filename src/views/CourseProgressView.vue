<script setup lang="ts">
import { computed, onMounted } from "vue"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"
import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import {
  buildCourseRoute,
  parseCourseRouteContext,
  CourseRouteContextError,
} from "@/domain/courses/routeContext"
import { translatedPlainText } from "@/domain/content/translatedHtml"
import { useCourseProgressStore } from "@/stores/courseProgress"
import { useLocaleStore } from "@/stores/locale"
const props = defineProps<{
  courseId: string
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
}>()
const { t } = useI18n()
const store = useCourseProgressStore()
const { status, snapshot, items, errorCode } = storeToRefs(store)
const localeStore = useLocaleStore()
const { contentLocale, contentFallbackLocales } = storeToRefs(localeStore)
const context = computed(() => {
  try {
    return parseCourseRouteContext(props)
  } catch (error) {
    if (error instanceof CourseRouteContextError) return null
    throw error
  }
})
const errorDescription = computed(() => t(`courseProgress.errors.${errorCode.value ?? "server"}`))
function plainContent(value: string): string {
  return translatedPlainText(value, contentLocale.value, contentFallbackLocales.value)
}
async function load() {
  if (context.value) await store.load(context.value)
}
onMounted(load)
</script>
<template>
  <CourseUnavailableState v-if="!context" kind="missing" />
  <div v-else class="space-y-5">
    <RouterLink
      :to="buildCourseRoute(context)"
      class="inline-flex min-h-touch items-center gap-2 rounded-xl px-2 text-sm font-semibold text-chamilo-700"
      ><i class="pi pi-arrow-left" aria-hidden="true" />{{
        t("courseProgress.backToCourse")
      }}</RouterLink
    >
    <section class="rounded-2xl bg-white p-4 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
        {{ t("courseProgress.eyebrow") }}
      </p>
      <h1 class="mt-1 text-xl font-semibold text-slate-900">{{ t("courseProgress.title") }}</h1>
      <p class="mt-2 text-sm text-slate-600">{{ t("courseProgress.description") }}</p>
      <div v-if="snapshot" class="mt-4 rounded-xl bg-slate-50 p-3">
        <div class="flex justify-between text-sm">
          <span>{{ t("courseProgress.totalAverage") }}</span
          ><strong>{{ Math.round(snapshot.totalAverage) }}%</strong>
        </div>
        <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            class="h-full bg-chamilo-600"
            :style="{ width: `${Math.min(100, Math.max(0, snapshot.totalAverage))}%` }"
          />
        </div>
      </div>
    </section>
    <LoadingState
      v-if="status === 'loading' || status === 'idle'"
      :label="t('courseProgress.loading')"
    />
    <ErrorState
      v-else-if="status === 'error'"
      :title="t('courseProgress.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      @retry="load"
    />
    <template v-else
      ><div v-if="items.length" class="space-y-4">
        <article
          v-for="thematic in items"
          :key="thematic.iid"
          class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-slate-900">{{ thematic.title }}</h2>
              <p v-if="thematic.content" class="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                {{ plainContent(thematic.content) }}
              </p>
            </div>
            <span
              class="rounded-full bg-chamilo-50 px-3 py-1 text-sm font-semibold text-chamilo-700"
              >{{ Math.round(thematic.average) }}%</span
            >
          </div>
          <p v-if="thematic.isInheritedFromCourse" class="mt-3 text-xs text-slate-500">
            {{ t("courseProgress.inherited") }}
          </p>
          <div v-if="thematic.plans.length" class="mt-4">
            <h3 class="text-sm font-semibold text-slate-800">{{ t("courseProgress.plans") }}</h3>
            <ul class="mt-2 space-y-2">
              <li v-for="plan in thematic.plans" :key="plan.iid" class="rounded-xl bg-slate-50 p-3">
                <p class="text-sm font-semibold">{{ plan.title }}</p>
                <p v-if="plan.description" class="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                  {{ plainContent(plan.description) }}
                </p>
              </li>
            </ul>
          </div>
          <div v-if="thematic.advances.length" class="mt-4">
            <h3 class="text-sm font-semibold text-slate-800">{{ t("courseProgress.advances") }}</h3>
            <ul class="mt-2 space-y-2">
              <li
                v-for="advance in thematic.advances"
                :key="advance.iid"
                class="flex gap-3 rounded-xl border border-slate-100 p-3"
              >
                <i
                  :class="
                    advance.doneAdvance
                      ? 'pi pi-check-circle text-green-600'
                      : 'pi pi-circle text-slate-400'
                  "
                  aria-hidden="true"
                />
                <div>
                  <p class="whitespace-pre-wrap text-sm text-slate-700">
                    {{ plainContent(advance.content) }}
                  </p>
                  <p v-if="advance.formattedStartDate" class="mt-1 text-xs text-slate-500">
                    {{ advance.formattedStartDate }}
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </article>
      </div>
      <EmptyState
        v-else
        :title="t('courseProgress.emptyTitle')"
        :description="t('courseProgress.emptyDescription')"
    /></template>
  </div>
</template>
