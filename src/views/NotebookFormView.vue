<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import {
  buildNotebookRoute,
  parseCourseRouteContext,
  CourseRouteContextError,
} from "@/domain/courses/routeContext"
import { useNotebookStore } from "@/stores/notebook"

const props = defineProps<{
  courseId: string
  notebookId: string | null
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
}>()
const { t } = useI18n()
const router = useRouter()
const store = useNotebookStore()
const { formStatus, mutationStatus, form, errorCode } = storeToRefs(store)
const title = ref("")
const content = ref("")
const language = ref("")
const submitted = ref(false)
const context = computed(() => {
  try {
    return parseCourseRouteContext(props)
  } catch (error) {
    if (error instanceof CourseRouteContextError) return null
    throw error
  }
})
const iid = computed(() => {
  if (!props.notebookId) return undefined
  const value = Number(props.notebookId)
  return Number.isInteger(value) && value > 0 ? value : undefined
})
const titleError = computed(() => submitted.value && !title.value.trim())
const errorDescription = computed(() => t(`notebook.errors.${errorCode.value ?? "server"}`))
watch(
  form,
  (value) => {
    if (!value) return
    title.value = value.title
    content.value = value.content
    language.value = value.language || value.languages[0]?.value || ""
  },
  { immediate: true },
)
async function load(): Promise<void> {
  if (context.value) await store.loadForm(context.value, iid.value)
}
async function save(): Promise<void> {
  submitted.value = true
  if (!context.value || !title.value.trim()) return
  const ok = await store.save(context.value, {
    title: title.value.trim(),
    content: content.value,
    language: language.value,
  })
  if (ok) await router.replace(buildNotebookRoute(context.value))
}
onMounted(load)
</script>

<template>
  <CourseUnavailableState v-if="!context" kind="missing" />
  <LoadingState
    v-else-if="formStatus === 'loading' || formStatus === 'idle'"
    :label="t('notebook.formLoading')"
  />
  <ErrorState
    v-else-if="formStatus === 'error'"
    :title="t('notebook.errorTitle')"
    :description="errorDescription"
    :retry-label="t('actions.retry')"
    @retry="load"
  />
  <section v-else-if="form" class="space-y-5">
    <RouterLink
      :to="buildNotebookRoute(context)"
      class="inline-flex min-h-touch items-center gap-2 rounded-xl px-2 text-sm font-semibold text-chamilo-700"
      ><i class="pi pi-arrow-left" aria-hidden="true" />{{ t("notebook.backToList") }}</RouterLink
    >
    <form class="space-y-5 rounded-2xl bg-white p-4 shadow-sm" @submit.prevent="save">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
          {{ t("notebook.eyebrow") }}
        </p>
        <h1 class="mt-1 text-xl font-semibold text-slate-900">
          {{ form.isNew ? t("notebook.createTitle") : t("notebook.editTitle") }}
        </h1>
      </div>
      <div>
        <label for="notebook-title" class="mb-1 block text-sm font-semibold text-slate-800">{{
          t("notebook.fields.title")
        }}</label
        ><input
          id="notebook-title"
          v-model="title"
          name="notebook-title"
          maxlength="255"
          class="min-h-touch w-full rounded-xl border px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500"
          :class="titleError ? 'border-red-500' : 'border-slate-300'"
          :disabled="!form.canWrite"
        />
        <p v-if="titleError" class="mt-1 text-sm text-red-700">
          {{ t("notebook.errors.validation") }}
        </p>
      </div>
      <div>
        <label for="notebook-content" class="mb-1 block text-sm font-semibold text-slate-800">{{
          t("notebook.fields.content")
        }}</label
        ><textarea
          id="notebook-content"
          v-model="content"
          name="notebook-content"
          rows="10"
          class="w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500"
          :disabled="!form.canWrite"
        />
      </div>
      <div v-if="form.languages.length">
        <label for="notebook-language" class="mb-1 block text-sm font-semibold text-slate-800">{{
          t("notebook.fields.language")
        }}</label
        ><select
          id="notebook-language"
          v-model="language"
          name="notebook-language"
          class="min-h-touch w-full rounded-xl border border-slate-300 px-3 disabled:bg-slate-100 disabled:text-slate-500"
          :disabled="!form.canWrite"
        >
          <option v-for="option in form.languages" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
      <div
        v-if="!form.canWrite"
        class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        role="status"
      >
        {{ t("notebook.readOnlyNotice") }}
      </div>
      <div
        v-if="errorCode && errorCode !== 'validation'"
        class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
      >
        {{ errorDescription }}
      </div>
      <div class="flex flex-wrap justify-end gap-2">
        <RouterLink
          :to="buildNotebookRoute(context)"
          class="inline-flex min-h-touch items-center rounded-xl border border-slate-300 px-4 font-semibold text-slate-700"
          >{{ t("actions.cancel") }}</RouterLink
        ><button
          type="submit"
          class="inline-flex min-h-touch items-center rounded-xl bg-chamilo-700 px-4 font-semibold text-white disabled:opacity-60"
          :disabled="mutationStatus === 'loading' || !form.canWrite"
        >
          {{ mutationStatus === "loading" ? t("notebook.saving") : t("actions.saveChanges") }}
        </button>
      </div>
    </form>
  </section>
</template>
