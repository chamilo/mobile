<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import type {
  AssignmentAvailabilityStatus,
  AssignmentComment,
  AssignmentSubmission,
  AssignmentSubmissionKind,
  AssignmentSubmissionManagementReason,
} from "@/domain/assignments/types"
import {
  buildAssignmentsRoute,
  buildLearningPathDetailRoute,
  CourseRouteContextError,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"
import { useAssignmentsStore } from "@/stores/assignments"
import { useAuthStore } from "@/stores/auth"

const props = defineProps<{
  courseId: string
  assignmentId: string
  assignmentTitle: string | null
  learningPathId?: string | null
  learningPathTitle?: string | null
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
}>()

const { t, d } = useI18n()
const store = useAssignmentsStore()
const authStore = useAuthStore()
const { profile } = storeToRefs(authStore)
const submissionTitle = ref("")
const submissionText = ref("")
const submissionKind = ref<AssignmentSubmissionKind>("text")
const selectedFile = ref<File | null>(null)
const localFileError = ref<string | null>(null)
const editingSubmissionId = ref<number | null>(null)
const editSubmissionTitle = ref("")
const editSubmissionDescription = ref("")
const managementSuccess = ref<"updated" | "deleted" | null>(null)
const MAX_MOBILE_FILE_BYTES = 5 * 1024 * 1024

const context = computed(() => {
  try {
    return parseCourseRouteContext(props)
  } catch (error) {
    if (error instanceof CourseRouteContextError) return null
    throw error
  }
})

const parsedAssignmentId = computed(() => {
  const value = Number(props.assignmentId)
  return Number.isInteger(value) && value > 0 ? value : null
})

const parsedLearningPathId = computed(() => {
  if (!props.learningPathId) return null

  const value = Number(props.learningPathId)
  return Number.isInteger(value) && value > 0 ? value : null
})

const backRoute = computed(() => {
  if (!context.value) return { name: "courses" }

  if (parsedLearningPathId.value) {
    return buildLearningPathDetailRoute(
      context.value,
      parsedLearningPathId.value,
      props.learningPathTitle || undefined,
    )
  }

  return buildAssignmentsRoute(context.value)
})

const usableContext = computed(() => context.value && parsedAssignmentId.value !== null)
const canCreateStudentSubmission = computed(() =>
  Boolean(
    profile.value?.roles.some((role) => role === "ROLE_STUDENT" || role === "ROLE_STUDENT_BOSS"),
  ),
)

const errorDescription = computed(() =>
  t(`assignments.errors.${store.detail.errorCode ?? "server"}`),
)

const writeErrorDescription = computed(() =>
  t(`assignments.errors.${store.write.errorCode ?? "server"}`),
)

const managementErrorDescription = computed(() =>
  t(`assignments.errors.${store.management.errorCode ?? "server"}`),
)

const deliveryErrorDescription = computed(() =>
  t(`assignments.errors.${store.delivery.errorCode ?? "server"}`),
)

const canSubmitBase = computed(() => {
  const assignment = store.detail.data?.assignment

  return (
    canCreateStudentSubmission.value &&
    assignment?.availabilityStatus !== "closed" &&
    store.write.status !== "loading"
  )
})

const canSubmitText = computed(
  () => canSubmitBase.value && store.detail.data?.assignment.textSubmissionAllowed === true,
)
const hasSubmissionMethod = computed(() =>
  Boolean(
    store.detail.data?.assignment.textSubmissionAllowed ||
    store.detail.data?.assignment.fileSubmissionAllowed,
  ),
)

const selectedFileExtension = computed(() => {
  const name = selectedFile.value?.name ?? ""
  const index = name.lastIndexOf(".")

  return index >= 0 ? name.slice(index + 1).toLowerCase() : ""
})

const fileValidationMessage = computed(() => {
  const file = selectedFile.value
  const assignment = store.detail.data?.assignment

  if (!file || !assignment) return null

  if (file.size > MAX_MOBILE_FILE_BYTES) {
    return t("assignments.submit.fileTooLarge", { size: formatFileSize(MAX_MOBILE_FILE_BYTES) })
  }

  if (
    assignment.allowedExtensions.length > 0 &&
    !assignment.allowedExtensions.includes(selectedFileExtension.value)
  ) {
    return t("assignments.submit.fileTypeNotAllowed", {
      extensions: assignment.allowedExtensions.join(", "),
    })
  }

  return null
})

const canSubmitFile = computed(
  () =>
    canSubmitBase.value &&
    store.detail.data?.assignment.fileSubmissionAllowed === true &&
    selectedFile.value !== null &&
    fileValidationMessage.value === null,
)

function formatDate(value: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : d(date, "long")
}

function availabilityLabel(status: AssignmentAvailabilityStatus): string {
  return t(`assignments.availability.${status}`)
}

function availabilityClass(status: AssignmentAvailabilityStatus): string {
  if (status === "open") return "bg-emerald-100 text-emerald-900"
  if (status === "late") return "bg-amber-100 text-amber-900"
  if (status === "closed") return "bg-slate-200 text-slate-800"
  return "bg-sky-100 text-sky-900"
}

async function load(): Promise<void> {
  if (context.value && parsedAssignmentId.value !== null) {
    await store.loadAssignment(context.value, parsedAssignmentId.value)

    if (!submissionTitle.value && store.detail.data?.assignment.title) {
      submissionTitle.value = store.detail.data.assignment.title
    }

    if (store.detail.data) {
      const assignment = store.detail.data.assignment

      if (assignment.textSubmissionAllowed) {
        submissionKind.value = "text"
      } else if (assignment.fileSubmissionAllowed) {
        submissionKind.value = "file"
      }
    }
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function submissionMethodGridClass(): string {
  const assignment = store.detail.data?.assignment

  return assignment?.textSubmissionAllowed && assignment.fileSubmissionAllowed
    ? "grid-cols-2"
    : "grid-cols-1"
}

function submissionTabClass(kind: AssignmentSubmissionKind): string {
  return submissionKind.value === kind ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
}

function selectSubmissionKind(kind: AssignmentSubmissionKind): void {
  submissionKind.value = kind
  store.resetWrite()
}

function selectFile(event: Event): void {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
  localFileError.value = null
  store.resetWrite()
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(reader.error ?? new Error("The file could not be read."))
    reader.onload = () => {
      const result = reader.result

      if (typeof result !== "string") {
        reject(new Error("The file could not be encoded."))
        return
      }

      const separatorIndex = result.indexOf(",")
      resolve(separatorIndex >= 0 ? result.slice(separatorIndex + 1) : result)
    }
    reader.readAsDataURL(file)
  })
}

function managementReasonLabel(reason: AssignmentSubmissionManagementReason | null): string {
  return t(`assignments.manage.reasons.${reason ?? "unavailable"}`)
}

function submissionFileKey(submissionId: number): string {
  return `submission:${submissionId}:file`
}

function correctionFileKey(submissionId: number): string {
  return `submission:${submissionId}:correction`
}

function commentFileKey(commentId: number): string {
  return `comment:${commentId}:file`
}

function isDelivering(key: string, action: "open" | "download"): boolean {
  return (
    store.delivery.status === "loading" &&
    store.delivery.key === key &&
    store.delivery.action === action
  )
}

async function openSubmissionFile(submission: AssignmentSubmission): Promise<void> {
  if (!submission.downloadUrl) return

  await store.openFile(
    submission.downloadUrl,
    `submission-${submission.id}`,
    submissionFileKey(submission.id),
  )
}

async function downloadSubmissionFile(submission: AssignmentSubmission): Promise<void> {
  if (!submission.downloadUrl) return

  await store.downloadFile(
    submission.downloadUrl,
    `submission-${submission.id}`,
    submissionFileKey(submission.id),
  )
}

async function openCorrectionFile(submission: AssignmentSubmission): Promise<void> {
  if (!submission.correctionDownloadUrl) return

  await store.openFile(
    submission.correctionDownloadUrl,
    submission.correctionTitle || `correction-${submission.id}`,
    correctionFileKey(submission.id),
  )
}

async function downloadCorrectionFile(submission: AssignmentSubmission): Promise<void> {
  if (!submission.correctionDownloadUrl) return

  await store.downloadFile(
    submission.correctionDownloadUrl,
    submission.correctionTitle || `correction-${submission.id}`,
    correctionFileKey(submission.id),
  )
}

async function openCommentFile(comment: AssignmentComment): Promise<void> {
  if (!comment.downloadUrl) return

  await store.openFile(
    comment.downloadUrl,
    comment.fileName || `feedback-${comment.id}`,
    commentFileKey(comment.id),
  )
}

async function downloadCommentFile(comment: AssignmentComment): Promise<void> {
  if (!comment.downloadUrl) return

  await store.downloadFile(
    comment.downloadUrl,
    comment.fileName || `feedback-${comment.id}`,
    commentFileKey(comment.id),
  )
}

function isManaging(submissionId: number, action: "update" | "delete"): boolean {
  return (
    store.management.status === "loading" &&
    store.management.submissionId === submissionId &&
    store.management.action === action
  )
}

function startSubmissionEdit(submission: AssignmentSubmission): void {
  if (!submission.canEdit) return

  store.resetManagement()
  managementSuccess.value = null
  editingSubmissionId.value = submission.id
  editSubmissionTitle.value = submission.title
  editSubmissionDescription.value = submission.description
}

function cancelSubmissionEdit(): void {
  editingSubmissionId.value = null
  editSubmissionTitle.value = ""
  editSubmissionDescription.value = ""
  store.resetManagement()
}

async function saveSubmissionEdit(submission: AssignmentSubmission): Promise<void> {
  if (!context.value || parsedAssignmentId.value === null || !submission.canEdit) return

  const title = editSubmissionTitle.value.trim()
  if (!title) return

  const updated = await store.updateSubmission(submission.id, {
    assignmentId: parsedAssignmentId.value,
    courseId: context.value.courseId,
    sessionId: context.value.sessionId,
    title,
    description: editSubmissionDescription.value.trim(),
  })

  if (!updated) return

  managementSuccess.value = "updated"
  editingSubmissionId.value = null
  await load()
}

async function removeSubmission(submission: AssignmentSubmission): Promise<void> {
  if (!context.value || parsedAssignmentId.value === null || !submission.canDelete) return

  const confirmed = globalThis.confirm(t("assignments.manage.deleteConfirmation"))
  if (!confirmed) return

  store.resetManagement()
  managementSuccess.value = null

  const deleted = await store.deleteSubmission({
    submissionId: submission.id,
    assignmentId: parsedAssignmentId.value,
    courseId: context.value.courseId,
    sessionId: context.value.sessionId,
  })

  if (!deleted) return

  managementSuccess.value = "deleted"
  editingSubmissionId.value = null
  await load()
}

async function submitCurrent(): Promise<void> {
  if (!context.value || parsedAssignmentId.value === null || !canSubmitBase.value) return

  const title = submissionTitle.value.trim()

  if (!title) return

  store.resetWrite()
  localFileError.value = null

  if (submissionKind.value === "text") {
    const text = submissionText.value.trim()

    if (!canSubmitText.value || !text) return

    const submitted = await store.submit({
      kind: "text",
      assignmentId: parsedAssignmentId.value,
      courseId: context.value.courseId,
      sessionId: context.value.sessionId,
      title,
      text,
    })

    if (!submitted) return

    submissionText.value = ""
  } else {
    const file = selectedFile.value

    if (!file || !canSubmitFile.value) return

    let base64Content: string

    try {
      base64Content = await readFileAsBase64(file)
    } catch {
      localFileError.value = t("assignments.submit.fileReadFailed")
      return
    }

    const submitted = await store.submit({
      kind: "file",
      assignmentId: parsedAssignmentId.value,
      courseId: context.value.courseId,
      sessionId: context.value.sessionId,
      title,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      base64Content,
    })

    if (!submitted) return

    selectedFile.value = null
  }

  await load()
}

onMounted(() => {
  store.resetWrite()
  store.resetManagement()
  store.resetDelivery()
  void load()
})
</script>

<template>
  <CourseUnavailableState v-if="!usableContext" kind="missing" />

  <div v-else-if="context && parsedAssignmentId !== null" class="space-y-5">
    <RouterLink
      :to="backRoute"
      class="inline-flex min-h-touch items-center gap-2 rounded-xl px-2 text-sm font-semibold text-chamilo-700"
    >
      <i class="pi pi-arrow-left" aria-hidden="true" />
      {{
        parsedLearningPathId
          ? t("assignments.backToLearningPath")
          : t("assignments.backToAssignments")
      }}
    </RouterLink>

    <LoadingState
      v-if="store.detail.status === 'loading' || store.detail.status === 'idle'"
      :label="t('assignments.detail.loading')"
    />

    <ErrorState
      v-else-if="store.detail.status === 'error'"
      :title="t('assignments.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      @retry="load"
    />

    <template v-else-if="store.detail.data">
      <section class="rounded-2xl bg-white p-4 shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
          {{ t("assignments.detail.eyebrow") }}
        </p>
        <h1 class="mt-1 break-words text-xl font-semibold text-slate-900">
          {{
            store.detail.data.assignment.title ||
            props.assignmentTitle ||
            t("assignments.detail.title")
          }}
        </h1>
        <p
          v-if="store.detail.data.assignment.description"
          class="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700"
        >
          {{ store.detail.data.assignment.description }}
        </p>

        <div class="mt-4 flex flex-wrap gap-2 text-xs">
          <span
            class="rounded-full px-2.5 py-1 font-semibold"
            :class="availabilityClass(store.detail.data.assignment.availabilityStatus)"
          >
            {{ availabilityLabel(store.detail.data.assignment.availabilityStatus) }}
          </span>

          <span
            v-if="store.detail.data.assignment.maximumScore !== null"
            class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700"
          >
            {{
              t("assignments.maximumScore", {
                score: store.detail.data.assignment.maximumScore,
              })
            }}
          </span>

          <span
            v-if="store.detail.data.assignment.textSubmissionAllowed"
            class="rounded-full bg-sky-100 px-2.5 py-1 text-sky-900"
          >
            {{ t("assignments.textAllowed") }}
          </span>

          <span
            v-if="store.detail.data.assignment.fileSubmissionAllowed"
            class="rounded-full bg-violet-100 px-2.5 py-1 text-violet-900"
          >
            {{ t("assignments.fileAllowed") }}
          </span>
        </div>

        <dl class="mt-4 space-y-2 text-sm">
          <div
            v-if="store.detail.data.assignment.publishedAt"
            class="flex flex-wrap justify-between gap-2"
          >
            <dt class="font-medium text-slate-600">
              {{ t("assignments.detail.published") }}
            </dt>
            <dd class="text-right text-slate-800">
              {{ formatDate(store.detail.data.assignment.publishedAt) }}
            </dd>
          </div>
          <div
            v-if="store.detail.data.assignment.dueAt"
            class="flex flex-wrap justify-between gap-2"
          >
            <dt class="font-medium text-slate-600">
              {{ t("assignments.detail.due") }}
            </dt>
            <dd class="text-right text-slate-800">
              {{ formatDate(store.detail.data.assignment.dueAt) }}
            </dd>
          </div>
          <div
            v-if="store.detail.data.assignment.endsAt"
            class="flex flex-wrap justify-between gap-2"
          >
            <dt class="font-medium text-slate-600">
              {{ t("assignments.detail.finalDeadline") }}
            </dt>
            <dd class="text-right text-slate-800">
              {{ formatDate(store.detail.data.assignment.endsAt) }}
            </dd>
          </div>
        </dl>

        <p
          v-if="store.detail.data.assignment.allowedExtensions.length"
          class="mt-4 text-xs text-slate-500"
        >
          {{
            t("assignments.allowedExtensions", {
              extensions: store.detail.data.assignment.allowedExtensions.join(", "),
            })
          }}
        </p>
      </section>

      <section
        v-if="canCreateStudentSubmission"
        class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
            {{ t("assignments.submit.eyebrow") }}
          </p>
          <h2 class="mt-1 text-lg font-semibold text-slate-900">
            {{ t("assignments.submit.title") }}
          </h2>
          <p class="mt-1 text-sm text-slate-600">
            {{ t("assignments.submit.description") }}
          </p>
        </div>

        <div
          v-if="
            canCreateStudentSubmission &&
            store.detail.data.assignment.availabilityStatus !== 'closed' &&
            hasSubmissionMethod
          "
          class="mt-4 space-y-4"
        >
          <div
            class="grid rounded-xl border border-slate-200 bg-slate-100 p-1"
            :class="submissionMethodGridClass()"
            role="tablist"
            :aria-label="t('assignments.submit.method')"
          >
            <button
              v-if="store.detail.data.assignment.textSubmissionAllowed"
              type="button"
              role="tab"
              class="min-h-touch rounded-lg px-3 py-2 text-sm font-semibold"
              :class="submissionTabClass('text')"
              :aria-selected="submissionKind === 'text'"
              @click="selectSubmissionKind('text')"
            >
              <i class="pi pi-align-left mr-1" aria-hidden="true" />
              {{ t("assignments.submit.textMethod") }}
            </button>
            <button
              v-if="store.detail.data.assignment.fileSubmissionAllowed"
              type="button"
              role="tab"
              class="min-h-touch rounded-lg px-3 py-2 text-sm font-semibold"
              :class="submissionTabClass('file')"
              :aria-selected="submissionKind === 'file'"
              @click="selectSubmissionKind('file')"
            >
              <i class="pi pi-upload mr-1" aria-hidden="true" />
              {{ t("assignments.submit.fileMethod") }}
            </button>
          </div>

          <form class="space-y-4" @submit.prevent="submitCurrent">
            <label class="block">
              <span class="text-sm font-semibold text-slate-800">
                {{ t("assignments.submit.submissionTitle") }}
              </span>
              <input
                v-model="submissionTitle"
                name="assignmentSubmissionTitle"
                type="text"
                maxlength="255"
                required
                class="focus:ring-chamilo-200 mt-2 min-h-touch w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-chamilo-600 focus:ring-2"
              />
            </label>

            <label v-if="submissionKind === 'text'" class="block">
              <span class="text-sm font-semibold text-slate-800">
                {{ t("assignments.submit.submissionText") }}
              </span>
              <textarea
                v-model="submissionText"
                name="assignmentSubmissionText"
                rows="8"
                maxlength="100000"
                required
                class="focus:ring-chamilo-200 mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-chamilo-600 focus:ring-2"
              />
            </label>

            <div v-else class="space-y-3">
              <label class="block">
                <span class="text-sm font-semibold text-slate-800">
                  {{ t("assignments.submit.chooseFile") }}
                </span>
                <input
                  name="assignmentSubmissionFile"
                  type="file"
                  class="file:text-chamilo-800 mt-2 block min-h-touch w-full rounded-xl border border-slate-300 bg-white p-2 text-sm text-slate-800 file:mr-3 file:rounded-lg file:border-0 file:bg-chamilo-50 file:px-3 file:py-2 file:font-semibold"
                  @change="selectFile"
                />
              </label>

              <div
                v-if="selectedFile"
                class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
              >
                <p class="break-all font-semibold text-slate-900">{{ selectedFile.name }}</p>
                <p class="mt-1 text-xs text-slate-500">{{ formatFileSize(selectedFile.size) }}</p>
              </div>

              <p class="text-xs text-slate-500">
                {{
                  t("assignments.submit.fileLimit", {
                    size: formatFileSize(MAX_MOBILE_FILE_BYTES),
                  })
                }}
              </p>
              <p
                v-if="store.detail.data.assignment.allowedExtensions.length"
                class="text-xs text-slate-500"
              >
                {{
                  t("assignments.allowedExtensions", {
                    extensions: store.detail.data.assignment.allowedExtensions.join(", "),
                  })
                }}
              </p>
              <p v-if="fileValidationMessage" class="text-sm text-red-700" role="alert">
                {{ fileValidationMessage }}
              </p>
              <p v-if="localFileError" class="text-sm text-red-700" role="alert">
                {{ localFileError }}
              </p>
            </div>

            <div
              v-if="store.write.status === 'error'"
              class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900"
              role="alert"
            >
              {{ writeErrorDescription }}
            </div>

            <div
              v-if="store.write.status === 'ready'"
              class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
              role="status"
            >
              {{ t("assignments.submit.success") }}
            </div>

            <button
              type="submit"
              class="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-chamilo-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="
                !submissionTitle.trim() ||
                (submissionKind === 'text'
                  ? !canSubmitText || !submissionText.trim()
                  : !canSubmitFile)
              "
            >
              <i
                class="pi"
                :class="store.write.status === 'loading' ? 'pi-spin pi-spinner' : 'pi-send'"
                aria-hidden="true"
              />
              {{
                store.write.status === "loading"
                  ? t("assignments.submit.submitting")
                  : t("assignments.submit.action")
              }}
            </button>
          </form>
        </div>

        <div
          v-else
          class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          role="status"
        >
          {{
            !canCreateStudentSubmission
              ? t("assignments.submit.studentOnly")
              : store.detail.data.assignment.availabilityStatus === "closed"
                ? t("assignments.submit.closed")
                : t("assignments.submit.noMethod")
          }}
        </div>
      </section>

      <section v-if="canCreateStudentSubmission" class="space-y-3">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">
            {{ t("assignments.detail.mySubmissions") }}
          </h2>
          <p class="mt-1 text-sm text-slate-600">
            {{ t("assignments.detail.mySubmissionsDescription") }}
          </p>
        </div>

        <div
          v-if="store.management.status === 'error'"
          class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900"
          role="alert"
        >
          {{ managementErrorDescription }}
        </div>

        <div
          v-if="store.delivery.status === 'error'"
          class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900"
          role="alert"
        >
          {{ deliveryErrorDescription }}
        </div>

        <div
          v-if="managementSuccess"
          class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
          role="status"
        >
          {{ t(`assignments.manage.${managementSuccess}`) }}
        </div>

        <div v-if="store.detail.data.submissions.length" class="space-y-3">
          <article
            v-for="submission in store.detail.data.submissions"
            :key="submission.id"
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="break-words font-semibold text-slate-900">
                  {{ submission.title }}
                </h3>
                <p v-if="submission.sentAt" class="mt-1 text-xs text-slate-500">
                  {{
                    t("assignments.detail.submitted", {
                      date: formatDate(submission.sentAt),
                    })
                  }}
                </p>
              </div>

              <span
                v-if="submission.score !== null"
                class="rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-semibold text-emerald-900"
              >
                <template v-if="submission.maximumScore !== null">
                  {{ submission.score }} / {{ submission.maximumScore }}
                </template>
                <template v-else>
                  {{ submission.score }}
                </template>
              </span>
            </div>

            <p
              v-if="submission.description"
              class="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700"
            >
              {{ submission.description }}
            </p>

            <div v-if="submission.hasFile" class="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div class="flex items-start gap-2">
                <i class="pi pi-paperclip mt-0.5 text-slate-500" aria-hidden="true" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-slate-900">
                    {{ t("assignments.detail.fileSubmitted") }}
                  </p>
                  <p class="mt-1 text-xs text-slate-500">
                    {{ t("assignments.detail.submittedFileDescription") }}
                  </p>
                </div>
              </div>

              <div v-if="submission.downloadUrl" class="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  class="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50"
                  :disabled="isDelivering(submissionFileKey(submission.id), 'open')"
                  @click="openSubmissionFile(submission)"
                >
                  <i
                    class="pi"
                    :class="
                      isDelivering(submissionFileKey(submission.id), 'open')
                        ? 'pi-spin pi-spinner'
                        : 'pi-eye'
                    "
                    aria-hidden="true"
                  />
                  {{
                    isDelivering(submissionFileKey(submission.id), "open")
                      ? t("assignments.detail.openingFile")
                      : t("assignments.detail.openFile")
                  }}
                </button>
                <button
                  type="button"
                  class="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl bg-chamilo-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  :disabled="isDelivering(submissionFileKey(submission.id), 'download')"
                  @click="downloadSubmissionFile(submission)"
                >
                  <i
                    class="pi"
                    :class="
                      isDelivering(submissionFileKey(submission.id), 'download')
                        ? 'pi-spin pi-spinner'
                        : 'pi-download'
                    "
                    aria-hidden="true"
                  />
                  {{
                    isDelivering(submissionFileKey(submission.id), "download")
                      ? t("assignments.detail.downloadingFile")
                      : t("assignments.detail.downloadFile")
                  }}
                </button>
              </div>
              <p v-else class="mt-2 text-xs text-slate-500">
                {{ t("assignments.detail.fileDownloadUnavailable") }}
              </p>
            </div>

            <div
              v-if="submission.correctionTitle"
              class="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3"
            >
              <div class="flex items-start gap-2">
                <i class="pi pi-check-circle mt-0.5 text-amber-700" aria-hidden="true" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-amber-950">
                    {{ t("assignments.detail.correctionAvailable") }}
                  </p>
                  <p class="mt-1 break-words text-sm text-amber-900">
                    {{
                      t("assignments.detail.correction", {
                        title: submission.correctionTitle,
                      })
                    }}
                  </p>
                </div>
              </div>

              <div
                v-if="submission.correctionDownloadUrl"
                class="mt-3 grid grid-cols-2 gap-2"
              >
                <button
                  type="button"
                  class="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 disabled:opacity-50"
                  :disabled="isDelivering(correctionFileKey(submission.id), 'open')"
                  @click="openCorrectionFile(submission)"
                >
                  <i
                    class="pi"
                    :class="
                      isDelivering(correctionFileKey(submission.id), 'open')
                        ? 'pi-spin pi-spinner'
                        : 'pi-eye'
                    "
                    aria-hidden="true"
                  />
                  {{ t("assignments.detail.openCorrection") }}
                </button>
                <button
                  type="button"
                  class="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl bg-amber-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  :disabled="isDelivering(correctionFileKey(submission.id), 'download')"
                  @click="downloadCorrectionFile(submission)"
                >
                  <i
                    class="pi"
                    :class="
                      isDelivering(correctionFileKey(submission.id), 'download')
                        ? 'pi-spin pi-spinner'
                        : 'pi-download'
                    "
                    aria-hidden="true"
                  />
                  {{ t("assignments.detail.downloadCorrection") }}
                </button>
              </div>
            </div>

            <form
              v-if="editingSubmissionId === submission.id"
              class="mt-4 space-y-3 border-t border-slate-100 pt-4"
              @submit.prevent="saveSubmissionEdit(submission)"
            >
              <label class="block">
                <span class="text-sm font-semibold text-slate-800">
                  {{ t("assignments.manage.titleLabel") }}
                </span>
                <input
                  v-model="editSubmissionTitle"
                  name="assignmentSubmissionEditTitle"
                  type="text"
                  maxlength="255"
                  required
                  class="focus:ring-chamilo-200 mt-2 min-h-touch w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-chamilo-600 focus:ring-2"
                />
              </label>

              <label class="block">
                <span class="text-sm font-semibold text-slate-800">
                  {{ t("assignments.manage.descriptionLabel") }}
                </span>
                <textarea
                  v-model="editSubmissionDescription"
                  name="assignmentSubmissionEditDescription"
                  rows="5"
                  maxlength="100000"
                  class="focus:ring-chamilo-200 mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-chamilo-600 focus:ring-2"
                />
              </label>

              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  class="inline-flex min-h-touch items-center justify-center rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                  :disabled="isManaging(submission.id, 'update')"
                  @click="cancelSubmissionEdit"
                >
                  {{ t("actions.cancel") }}
                </button>
                <button
                  type="submit"
                  class="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl bg-chamilo-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  :disabled="!editSubmissionTitle.trim() || isManaging(submission.id, 'update')"
                >
                  <i
                    class="pi"
                    :class="isManaging(submission.id, 'update') ? 'pi-spin pi-spinner' : 'pi-check'"
                    aria-hidden="true"
                  />
                  {{
                    isManaging(submission.id, "update")
                      ? t("assignments.manage.saving")
                      : t("assignments.manage.save")
                  }}
                </button>
              </div>
            </form>

            <div
              v-else-if="submission.canEdit || submission.canDelete"
              class="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4"
            >
              <button
                v-if="submission.canEdit"
                type="button"
                class="border-chamilo-200 text-chamilo-800 inline-flex min-h-touch items-center gap-2 rounded-xl border bg-chamilo-50 px-3 py-2 text-sm font-semibold"
                @click="startSubmissionEdit(submission)"
              >
                <i class="pi pi-pencil" aria-hidden="true" />
                {{ t("assignments.manage.edit") }}
              </button>
              <button
                v-if="submission.canDelete"
                type="button"
                class="inline-flex min-h-touch items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 disabled:opacity-50"
                :disabled="isManaging(submission.id, 'delete')"
                @click="removeSubmission(submission)"
              >
                <i
                  class="pi"
                  :class="isManaging(submission.id, 'delete') ? 'pi-spin pi-spinner' : 'pi-trash'"
                  aria-hidden="true"
                />
                {{
                  isManaging(submission.id, "delete")
                    ? t("assignments.manage.deleting")
                    : t("assignments.manage.delete")
                }}
              </button>
            </div>

            <div
              v-else-if="submission.editBlockedReason || submission.deleteBlockedReason"
              class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"
              role="status"
            >
              {{
                managementReasonLabel(
                  submission.editBlockedReason ?? submission.deleteBlockedReason,
                )
              }}
            </div>

            <div v-if="submission.comments.length" class="mt-4 border-t border-slate-100 pt-4">
              <h4 class="text-sm font-semibold text-slate-900">
                {{ t("assignments.detail.feedback") }}
              </h4>

              <div class="mt-3 space-y-3">
                <div
                  v-for="comment in submission.comments"
                  :key="comment.id"
                  class="rounded-xl bg-slate-50 p-3"
                >
                  <div class="flex flex-wrap justify-between gap-2">
                    <p class="text-sm font-semibold text-slate-800">
                      {{ comment.authorName }}
                    </p>
                    <p v-if="comment.sentAt" class="text-xs text-slate-500">
                      {{ formatDate(comment.sentAt) }}
                    </p>
                  </div>
                  <p
                    v-if="comment.text"
                    class="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700"
                  >
                    {{ comment.text }}
                  </p>
                  <div
                    v-if="comment.fileName"
                    class="mt-3 rounded-lg border border-slate-200 bg-white p-2.5"
                  >
                    <p class="break-words text-xs font-semibold text-slate-700">
                      {{
                        t("assignments.detail.feedbackFile", {
                          file: comment.fileName,
                        })
                      }}
                    </p>
                    <div v-if="comment.downloadUrl" class="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        class="inline-flex min-h-touch items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
                        :disabled="isDelivering(commentFileKey(comment.id), 'open')"
                        @click="openCommentFile(comment)"
                      >
                        <i class="pi pi-eye" aria-hidden="true" />
                        {{ t("assignments.detail.openAttachment") }}
                      </button>
                      <button
                        type="button"
                        class="inline-flex min-h-touch items-center gap-2 rounded-lg bg-chamilo-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        :disabled="isDelivering(commentFileKey(comment.id), 'download')"
                        @click="downloadCommentFile(comment)"
                      >
                        <i class="pi pi-download" aria-hidden="true" />
                        {{ t("assignments.detail.downloadAttachment") }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>

        <EmptyState
          v-else
          :title="t('assignments.detail.emptySubmissionsTitle')"
          :description="t('assignments.detail.emptySubmissionsDescription')"
        />
      </section>
    </template>
  </div>
</template>
