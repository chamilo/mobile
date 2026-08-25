<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

import ExerciseStructuralHtml from "@/components/exercises/ExerciseStructuralHtml.vue"
import { translatedPlainText } from "@/domain/content/translatedHtml"
import {
  exerciseStructuralHtmlRequiresCampus,
  sanitizeExerciseStructuralHtml,
} from "@/domain/exercises/runtimePages"
import type { ExerciseAnswerFeedback } from "@/domain/exercises/types"

const props = defineProps<{
  feedback: ExerciseAnswerFeedback
  locale: string
  fallbackLocales?: string[]
  popup?: boolean
  actionError?: string
  campusBaseUrl?: string | null
  campusUrlAvailable?: boolean
}>()

const emit = defineEmits<{
  proceed: []
  openCampus: []
}>()

const { t } = useI18n()
const proceedButton = ref<HTMLButtonElement | null>(null)
const requiresCampusFeedbackContent = computed(() =>
  props.feedback.entries.some((entry) =>
    [entry.answer, entry.comment].some(
      (value) =>
        Boolean(value.trim()) &&
        exerciseStructuralHtmlRequiresCampus(value, props.campusBaseUrl ?? null),
    ),
  ),
)

function statusLabel(): string {
  switch (props.feedback.status) {
    case "correct":
      return t("exercises.feedback.correct")
    case "partial":
      return t("exercises.feedback.partial")
    case "pending":
      return t("exercises.feedback.pending")
    case "empty":
      return t("exercises.feedback.empty")
    default:
      return t("exercises.feedback.incorrect")
  }
}

function statusClasses(): string {
  switch (props.feedback.status) {
    case "correct":
      return "border-emerald-200 bg-emerald-50 text-emerald-900"
    case "partial":
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-900"
    default:
      return "border-red-200 bg-red-50 text-red-900"
  }
}

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function escapeHtml(value: string): string {
  const container = document.createElement("div")
  container.textContent = value
  return container.innerHTML
}

function feedbackHtml(value: string): string {
  if (exerciseStructuralHtmlRequiresCampus(value, props.campusBaseUrl ?? null)) {
    return escapeHtml(translatedPlainText(value, props.locale, props.fallbackLocales ?? []))
  }

  return sanitizeExerciseStructuralHtml(value, props.locale, props.fallbackLocales ?? [])
}

function actionLabel(): string {
  switch (props.feedback.afterAction) {
    case "finish":
      return t("exercises.feedback.endExercise")
    case "repeat":
      return t("exercises.feedback.tryAgain")
    case "url":
      return t("exercises.feedback.openDestination")
    default:
      return t("exercises.feedback.continue")
  }
}

watch(
  () => props.popup,
  async (popup) => {
    if (!popup) return
    await nextTick()
    proceedButton.value?.focus()
  },
  { immediate: true },
)
</script>

<template>
  <div
    :class="
      popup
        ? 'fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
        : ''
    "
    :role="popup ? 'dialog' : undefined"
    :aria-modal="popup ? 'true' : undefined"
    :aria-label="popup ? t('exercises.feedback.title') : undefined"
  >
    <section
      class="w-full space-y-4 rounded-2xl border p-4 shadow-sm"
      :class="[statusClasses(), popup ? 'max-h-[85vh] max-w-xl overflow-y-auto bg-white text-slate-900' : '']"
      aria-live="polite"
    >
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide">
          {{ t("exercises.feedback.title") }}
        </p>
        <h3 class="mt-1 text-lg font-semibold">{{ statusLabel() }}</h3>
        <p class="mt-1 text-sm">
          {{ t("exercises.feedback.score", { score: formatScore(feedback.score), max: formatScore(feedback.maxScore) }) }}
        </p>
        <p v-if="feedback.achievedLevel" class="mt-1 text-sm">
          {{ t("exercises.feedback.achievedLevel", { level: feedback.achievedLevel }) }}
        </p>
        <p v-if="feedback.categoryScore !== null" class="mt-1 text-sm">
          {{ t("exercises.feedback.categoryScore", { score: formatScore(feedback.categoryScore) }) }}
        </p>
      </div>

      <div v-if="feedback.entries.length > 0" class="space-y-3">
        <article
          v-for="(entry, index) in feedback.entries"
          :key="`${feedback.questionId}-feedback-${index}`"
          class="rounded-xl border border-slate-200 bg-white/90 p-3 text-slate-800"
        >
          <ExerciseStructuralHtml
            v-if="entry.answer"
            class="font-medium [&_a]:text-chamilo-700 [&_img]:h-auto [&_img]:max-w-full"
            :html="feedbackHtml(entry.answer)"
          />
          <ExerciseStructuralHtml
            v-if="entry.comment"
            class="mt-2 text-sm [&_a]:text-chamilo-700 [&_img]:h-auto [&_img]:max-w-full"
            :html="feedbackHtml(entry.comment)"
          />
        </article>
      </div>
      <p v-else class="text-sm">{{ t("exercises.feedback.noDetails") }}</p>

      <div
        v-if="requiresCampusFeedbackContent"
        class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
      >
        <p>{{ t("exercises.feedback.protectedContentNotice") }}</p>
        <button
          v-if="campusUrlAvailable"
          type="button"
          class="mt-3 min-h-touch rounded-xl border border-amber-700 bg-white px-4 font-semibold text-amber-900"
          @click="emit('openCampus')"
        >
          {{ t("exercises.openOnCampus") }}
        </button>
      </div>

      <p v-if="actionError" class="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
        {{ actionError }}
      </p>

      <button
        ref="proceedButton"
        type="button"
        class="min-h-touch w-full rounded-xl bg-chamilo-700 px-4 font-semibold text-white"
        @click="emit('proceed')"
      >
        {{ actionLabel() }}
      </button>
    </section>
  </div>
</template>
