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
  buildNotebookFormRoute,
  parseCourseRouteContext,
  CourseRouteContextError,
} from "@/domain/courses/routeContext"
import { useNotebookStore } from "@/stores/notebook"

const props = defineProps<{
  courseId: string
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
}>()
const { t } = useI18n()
const store = useNotebookStore()
const { listStatus, mutationStatus, items, canWrite, errorCode } = storeToRefs(store)
const context = computed(() => {
  try {
    return parseCourseRouteContext(props)
  } catch (error) {
    if (error instanceof CourseRouteContextError) return null
    throw error
  }
})
const errorDescription = computed(() => t(`notebook.errors.${errorCode.value ?? "server"}`))
async function load(): Promise<void> {
  if (context.value) await store.loadList(context.value)
}
async function remove(iid: number): Promise<void> {
  if (!context.value || !window.confirm(t("notebook.deleteConfirmation"))) return
  await store.remove(context.value, iid)
}
onMounted(load)
</script>

<template>
  <CourseUnavailableState v-if="!context" kind="missing" />
  <div v-else class="space-y-5">
    <RouterLink
      :to="buildCourseRoute(context)"
      class="inline-flex min-h-touch items-center gap-2 rounded-xl px-2 text-sm font-semibold text-chamilo-700 focus:outline-none focus:ring-2 focus:ring-chamilo-600"
    >
      <i class="pi pi-arrow-left" aria-hidden="true" />{{ t("notebook.backToCourse") }}
    </RouterLink>
    <section class="rounded-2xl bg-white p-4 shadow-sm">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
            {{ t("notebook.eyebrow") }}
          </p>
          <h1 class="mt-1 text-xl font-semibold text-slate-900">{{ t("notebook.title") }}</h1>
          <p class="mt-2 text-sm text-slate-600">{{ t("notebook.description") }}</p>
        </div>
        <RouterLink
          v-if="canWrite"
          :to="buildNotebookFormRoute(context)"
          class="inline-flex min-h-touch items-center gap-2 rounded-xl bg-chamilo-700 px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-chamilo-600 focus:ring-offset-2"
          ><i class="pi pi-plus" aria-hidden="true" />{{ t("notebook.add") }}</RouterLink
        >
      </div>
    </section>
    <LoadingState
      v-if="listStatus === 'loading' || listStatus === 'idle'"
      :label="t('notebook.loading')"
    />
    <ErrorState
      v-else-if="listStatus === 'error'"
      :title="t('notebook.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      @retry="load"
    />
    <template v-else>
      <div v-if="items.length" class="space-y-3">
        <article
          v-for="note in items"
          :key="note.iid"
          class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h2 class="text-base font-semibold text-slate-900">{{ note.title }}</h2>
          <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {{ note.content }}
          </p>
          <div
            v-if="note.canEdit || note.canDelete"
            class="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3"
          >
            <RouterLink
              v-if="note.canEdit"
              :to="buildNotebookFormRoute(context, note.iid)"
              class="inline-flex min-h-touch items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-chamilo-700"
              ><i class="pi pi-pencil" aria-hidden="true" />{{ t("actions.edit") }}</RouterLink
            >
            <button
              v-if="note.canDelete"
              type="button"
              class="inline-flex min-h-touch items-center gap-2 rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-700 disabled:opacity-60"
              :disabled="mutationStatus === 'loading'"
              @click="remove(note.iid)"
            >
              <i class="pi pi-trash" aria-hidden="true" />{{ t("actions.remove") }}
            </button>
          </div>
        </article>
      </div>
      <EmptyState
        v-else
        :title="t('notebook.emptyTitle')"
        :description="t('notebook.emptyDescription')"
      />
    </template>
  </div>
</template>
