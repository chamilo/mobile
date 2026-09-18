<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

import ExerciseQuestionField from "@/components/exercises/ExerciseQuestionField.vue"
import { isSupportedExerciseQuestion } from "@/domain/exercises/answers"
import { sanitizeExerciseStructuralHtml } from "@/domain/exercises/runtimePages"
import type { ExerciseAnswerState, ExerciseQuestion } from "@/domain/exercises/types"
import { createDocumentBlobPresenter } from "@/services/documents/DocumentBlobPresenter"
import { useExercisesStore } from "@/stores/exercises"

const READING_REFRESH_SECONDS = 3
const DROPDOWN_TYPES = [28, 29]

const props = defineProps<{
  question: ExerciseQuestion
  answer: ExerciseAnswerState
  disabled?: boolean
  showTitle?: boolean
  reviewEnabled?: boolean
  teacherPreview?: boolean
  pendingFile?: File | null
  readingAutoStart?: boolean
  readingPreviouslyCompleted?: boolean
}>()

const emit = defineEmits<{
  updateAnswer: [value: ExerciseAnswerState]
  selectFile: [file: File | null]
  readingState: [value: { questionId: number; started: boolean; complete: boolean }]
}>()

const { t } = useI18n()
const store = useExercisesStore()
const documentPresenter = createDocumentBlobPresenter()

const annotationImageSrc = ref<string | null>(null)
const annotationImageLoading = ref(false)
const annotationImageError = ref(false)
const hotspotImageSrc = ref<string | null>(null)
const hotspotImageLoading = ref(false)
const hotspotImageError = ref(false)
const officeTemplateLoading = ref(false)
const officeTemplateError = ref(false)

const readingStarted = ref(false)
const readingStep = ref(-1)
const readingComplete = ref(true)
const readingTotalSteps = ref(0)

let annotationImageObjectUrl: string | null = null
let annotationImageLoadSequence = 0
let hotspotImageObjectUrl: string | null = null
let hotspotImageLoadSequence = 0
let readingTimer: ReturnType<typeof setInterval> | null = null

const isReadingQuestion = computed(
  () => props.question.type === 21 && Boolean(props.question.reading),
)
const isDropdownQuestion = computed(
  () => DROPDOWN_TYPES.includes(props.question.type) && Boolean(props.question.dropdown),
)
const readingSourceHtml = computed(
  () => props.question.reading?.text || props.question.description || "",
)
const readingHtml = computed(() => sanitizeExerciseStructuralHtml(readingSourceHtml.value, ""))
const readingWordsPerStep = computed(() => {
  const speed = Math.max(1, Number(props.question.reading?.speed || 50))
  return Math.max(1, Math.floor((speed / 60) * READING_REFRESH_SECONDS))
})
const selectedDropdownIds = computed(() => {
  if (Array.isArray(props.answer.dropdown)) return props.answer.dropdown
  const selected = Number(props.answer.dropdown ?? 0)
  return selected > 0 ? [selected] : []
})
const dropdownSummary = computed(() => {
  const selected = selectedDropdownIds.value
  if (selected.length === 0) return t("exercises.selectAnswer")

  const labels = (props.question.dropdown?.options ?? [])
    .filter((option) => selected.includes(option.id))
    .map((option) => plainText(option.answer))
    .filter(Boolean)

  return labels.length === 1
    ? labels[0]
    : t("exercises.selectedAnswers", { count: selected.length })
})
const readingFinished = computed(
  () => readingComplete.value || props.readingPreviouslyCompleted === true,
)
const readingDisplayHtml = computed(() => buildReadingDisplayHtml())

function plainText(value: string): string {
  const container = document.createElement("div")
  container.innerHTML = value
  return (container.textContent ?? "").trim()
}

function emitReadingState(): void {
  emit("readingState", {
    questionId: props.question.id,
    started: readingStarted.value,
    complete: readingFinished.value,
  })
}

function stopReadingTimer(): void {
  if (readingTimer) clearInterval(readingTimer)
  readingTimer = null
}

function countReadingWords(): number {
  return plainText(readingHtml.value).split(/\s+/u).filter(Boolean).length
}

function calculateReadingTotalSteps(): number {
  const wordCount = countReadingWords()
  if (wordCount <= 0) return 0
  return Math.max(1, Math.ceil(wordCount / readingWordsPerStep.value))
}

function initializeReading(): void {
  stopReadingTimer()

  if (!isReadingQuestion.value) {
    readingStarted.value = false
    readingStep.value = -1
    readingTotalSteps.value = 0
    readingComplete.value = true
    emitReadingState()
    return
  }

  readingTotalSteps.value = calculateReadingTotalSteps()
  const alreadyComplete = props.readingPreviouslyCompleted === true || readingTotalSteps.value === 0
  readingStarted.value = alreadyComplete
  readingStep.value = alreadyComplete ? Math.max(0, readingTotalSteps.value - 1) : -1
  readingComplete.value = alreadyComplete
  emitReadingState()

  if (!alreadyComplete && props.readingAutoStart === true) startReading()
}

function completeReading(): void {
  stopReadingTimer()
  readingStarted.value = true
  readingStep.value = Math.max(0, readingTotalSteps.value - 1)
  readingComplete.value = true
  emitReadingState()
}

function advanceReading(): void {
  if (readingComplete.value) {
    stopReadingTimer()
    return
  }

  const nextStep = readingStep.value + 1
  readingStep.value = nextStep
  readingStarted.value = true

  if (nextStep >= readingTotalSteps.value - 1) {
    completeReading()
    return
  }

  emitReadingState()
}

function startReading(): void {
  if (!isReadingQuestion.value || readingStarted.value || readingFinished.value) return

  if (readingTotalSteps.value <= 0) {
    completeReading()
    return
  }

  readingStarted.value = true
  readingStep.value = 0
  readingComplete.value = readingTotalSteps.value === 1
  emitReadingState()

  if (readingComplete.value) return

  stopReadingTimer()
  readingTimer = setInterval(advanceReading, READING_REFRESH_SECONDS * 1000)
}

function buildReadingDisplayHtml(): string {
  const html = readingHtml.value
  if (!isReadingQuestion.value || !html || typeof document === "undefined") return html

  const container = document.createElement("div")
  container.innerHTML = html
  const textNodes: Text[] = []
  const walker = document.createTreeWalker(container, window.NodeFilter?.SHOW_TEXT || 4)
  let node = walker.nextNode()

  while (node) {
    const parentTag = String(node.parentElement?.tagName || "").toUpperCase()
    if (!["SCRIPT", "STYLE", "NOSCRIPT"].includes(parentTag)) textNodes.push(node as Text)
    node = walker.nextNode()
  }

  let wordIndex = 0
  for (const textNode of textNodes) {
    const parts = String(textNode.nodeValue || "").split(/(\s+)/u)
    const fragment = document.createDocumentFragment()

    for (const part of parts) {
      if (!part) continue
      if (/^\s+$/u.test(part)) {
        fragment.appendChild(document.createTextNode(part))
        continue
      }

      const wordStep = Math.floor(wordIndex / readingWordsPerStep.value)
      const span = document.createElement("span")
      span.textContent = part
      span.classList.add("exercise-reading-word")

      if (readingStarted.value && wordStep === readingStep.value) {
        span.classList.add("exercise-reading-word-active")
      } else if (readingStarted.value && Math.abs(wordStep - readingStep.value) === 1) {
        span.classList.add("exercise-reading-word-border")
      }

      fragment.appendChild(span)
      wordIndex += 1
    }

    textNode.parentNode?.replaceChild(fragment, textNode)
  }

  return container.innerHTML
}

function updateReadingChoice(choiceId: number): void {
  emit("updateAnswer", { ...props.answer, choice: choiceId })
}

function toggleDropdownOption(optionId: number, checked: boolean): void {
  const current = selectedDropdownIds.value
  const dropdown = checked
    ? [...new Set([...current, optionId])]
    : current.filter((id) => id !== optionId)

  emit("updateAnswer", { ...props.answer, dropdown })
}

function releaseAnnotationImage(): void {
  if (annotationImageObjectUrl) URL.revokeObjectURL(annotationImageObjectUrl)
  annotationImageObjectUrl = null
  annotationImageSrc.value = null
}

async function loadAnnotationImage(): Promise<void> {
  const sequence = ++annotationImageLoadSequence
  const imageUrl = props.question.annotation?.imageUrl?.trim() ?? ""

  releaseAnnotationImage()
  annotationImageLoading.value = false
  annotationImageError.value = false

  if (!props.question.annotation) return
  if (!imageUrl) {
    annotationImageError.value = true
    return
  }

  annotationImageLoading.value = true
  try {
    const blob = await store.loadAnnotationImage(imageUrl)
    if (sequence !== annotationImageLoadSequence) return
    annotationImageObjectUrl = URL.createObjectURL(blob)
    annotationImageSrc.value = annotationImageObjectUrl
  } catch {
    if (sequence === annotationImageLoadSequence) annotationImageError.value = true
  } finally {
    if (sequence === annotationImageLoadSequence) annotationImageLoading.value = false
  }
}

function releaseHotspotImage(): void {
  if (hotspotImageObjectUrl) URL.revokeObjectURL(hotspotImageObjectUrl)
  hotspotImageObjectUrl = null
  hotspotImageSrc.value = null
}

async function loadHotspotImage(): Promise<void> {
  const sequence = ++hotspotImageLoadSequence
  const imageUrl = props.question.hotspot?.imageUrl?.trim() ?? ""

  releaseHotspotImage()
  hotspotImageLoading.value = false
  hotspotImageError.value = false

  if (!props.question.hotspot) return
  if (!imageUrl) {
    hotspotImageError.value = true
    return
  }

  hotspotImageLoading.value = true
  try {
    const blob = await store.loadHotspotImage(imageUrl)
    if (sequence !== hotspotImageLoadSequence) return
    hotspotImageObjectUrl = URL.createObjectURL(blob)
    hotspotImageSrc.value = hotspotImageObjectUrl
  } catch {
    if (sequence === hotspotImageLoadSequence) hotspotImageError.value = true
  } finally {
    if (sequence === hotspotImageLoadSequence) hotspotImageLoading.value = false
  }
}

function resetOfficeTemplateState(): void {
  officeTemplateLoading.value = false
  officeTemplateError.value = false
}

async function getOfficeTemplateBlob(): Promise<{ blob: Blob; filename: string } | null> {
  const onlyoffice = props.question.onlyoffice
  const templateUrl = onlyoffice?.templateUrl?.trim() ?? ""

  officeTemplateError.value = false
  if (!onlyoffice || !templateUrl) {
    officeTemplateError.value = true
    return null
  }

  officeTemplateLoading.value = true
  try {
    const blob = await store.loadOfficeDocumentTemplate(templateUrl)
    return { blob, filename: onlyoffice.templateName.trim() || "office_document.docx" }
  } catch {
    officeTemplateError.value = true
    return null
  } finally {
    officeTemplateLoading.value = false
  }
}

async function openOfficeTemplate(): Promise<void> {
  const template = await getOfficeTemplateBlob()
  if (!template) return

  try {
    await documentPresenter.open(template.blob, template.filename)
  } catch {
    officeTemplateError.value = true
  }
}

async function downloadOfficeTemplate(): Promise<void> {
  const template = await getOfficeTemplateBlob()
  if (!template) return

  try {
    await documentPresenter.download(template.blob, template.filename)
  } catch {
    officeTemplateError.value = true
  }
}

watch(
  () => [
    props.question.id,
    props.question.reading?.text ?? null,
    props.question.reading?.speed ?? null,
    props.readingAutoStart ?? false,
    props.readingPreviouslyCompleted ?? false,
  ],
  initializeReading,
  { immediate: true },
)

watch(
  () => [props.question.id, props.question.annotation?.imageUrl ?? null],
  () => void loadAnnotationImage(),
  { immediate: true },
)

watch(
  () => [props.question.id, props.question.hotspot?.imageUrl ?? null],
  () => void loadHotspotImage(),
  { immediate: true },
)

watch(
  () => [props.question.id, props.question.onlyoffice?.templateUrl ?? null],
  () => resetOfficeTemplateState(),
  { immediate: true },
)

onBeforeUnmount(() => {
  annotationImageLoadSequence += 1
  hotspotImageLoadSequence += 1
  stopReadingTimer()
  releaseAnnotationImage()
  releaseHotspotImage()
})
</script>

<template>
  <section class="rounded-2xl bg-white p-4 shadow-sm">
    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {{ question.typeLabel }}
    </p>
    <h2
      v-if="showTitle !== false && (!isReadingQuestion || readingFinished)"
      class="mt-1 text-lg font-semibold text-slate-900"
    >
      {{ question.title }}
    </h2>
    <p v-if="question.description && !isReadingQuestion" class="mt-2 text-sm text-slate-600">
      {{ question.description }}
    </p>

    <div v-if="isReadingQuestion" class="mt-5 space-y-5">
      <section class="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="font-medium text-slate-900">
            {{ t("exercises.readingPassage") }}
          </p>
          <span
            v-if="(question.reading?.speed ?? 0) > 0"
            class="text-xs font-medium text-slate-500"
          >
            {{ t("exercises.readingSpeed", { speed: question.reading?.speed ?? 0 }) }}
          </span>
        </div>

        <div
          v-if="!readingStarted && !readingFinished && !readingAutoStart"
          class="mt-4 flex justify-center"
        >
          <button
            type="button"
            class="min-h-touch rounded-xl bg-chamilo-700 px-5 py-2 font-semibold text-white disabled:opacity-50"
            :disabled="disabled"
            @click="startReading"
          >
            <i class="pi pi-play mr-2" aria-hidden="true" />
            {{ t("exercises.readingStart") }}
          </button>
        </div>

        <div
          class="exercise-reading-text mt-4 text-base leading-7 text-slate-800 [&_a]:text-chamilo-700 [&_audio]:max-w-full [&_img]:h-auto [&_img]:max-w-full [&_video]:max-w-full"
          dir="auto"
          v-html="readingDisplayHtml"
        />
      </section>

      <div v-if="readingFinished" class="space-y-3">
        <label
          v-for="choice in question.choices"
          :key="choice.id"
          class="flex min-h-touch items-start gap-3 rounded-xl border border-slate-200 p-3"
        >
          <input
            :name="`question-${question.id}`"
            type="radio"
            :value="choice.id"
            :checked="answer.choice === choice.id"
            class="mt-1"
            :disabled="disabled"
            @change="updateReadingChoice(choice.id)"
          />
          <span>{{ choice.answer }}</span>
        </label>
      </div>
    </div>

    <details
      v-else-if="isDropdownQuestion"
      class="mt-5 rounded-xl border border-slate-300 bg-white"
    >
      <summary
        class="flex min-h-touch cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-medium text-slate-800"
      >
        <span class="min-w-0 flex-1 truncate">{{ dropdownSummary }}</span>
        <i class="pi pi-chevron-down shrink-0 text-slate-500" aria-hidden="true" />
      </summary>
      <div class="border-t border-slate-200 p-2">
        <label
          v-for="option in question.dropdown?.options ?? []"
          :key="option.id"
          class="flex min-h-touch items-start gap-3 rounded-lg px-3 py-2 text-sm text-slate-800"
        >
          <input
            :name="`question-${question.id}-dropdown-${option.id}`"
            type="checkbox"
            class="mt-1"
            :checked="selectedDropdownIds.includes(option.id)"
            :disabled="disabled"
            @change="
              toggleDropdownOption(option.id, ($event.target as HTMLInputElement).checked)
            "
          />
          <span class="min-w-0 flex-1">{{ option.answer }}</span>
        </label>
      </div>
    </details>

    <ExerciseQuestionField
      v-else
      class="mt-5"
      :question="question"
      :model-value="answer"
      :disabled="disabled || !isSupportedExerciseQuestion(question)"
      :annotation-image-src="annotationImageSrc"
      :annotation-image-loading="annotationImageLoading"
      :annotation-image-error="annotationImageError"
      :hotspot-image-src="hotspotImageSrc"
      :hotspot-image-loading="hotspotImageLoading"
      :hotspot-image-error="hotspotImageError"
      :office-template-loading="officeTemplateLoading"
      :office-template-error="officeTemplateError"
      :pending-file-name="pendingFile?.name ?? null"
      @update:model-value="emit('updateAnswer', $event)"
      @retry-annotation-image="loadAnnotationImage"
      @retry-hotspot-image="loadHotspotImage"
      @open-office-template="openOfficeTemplate"
      @download-office-template="downloadOfficeTemplate"
      @select-answer-file="emit('selectFile', $event)"
    />

    <label
      v-if="reviewEnabled && !teacherPreview && (!isReadingQuestion || readingFinished)"
      class="mt-5 flex min-h-touch items-center gap-3 text-sm text-slate-700"
    >
      <input
        :name="`question-${question.id}-review-later`"
        type="checkbox"
        :checked="answer.reviewLater"
        @change="
          emit('updateAnswer', {
            ...answer,
            reviewLater: ($event.target as HTMLInputElement).checked,
          })
        "
      />
      {{ t("exercises.reviewLater") }}
    </label>
  </section>
</template>

<style scoped>
.exercise-reading-text {
  user-select: none;
}

.exercise-reading-text :deep(.exercise-reading-word) {
  color: transparent;
  text-shadow: 0 0 5px rgb(0 0 0 / 50%);
  transition:
    color 0.12s linear,
    text-shadow 0.12s linear;
}

.exercise-reading-text :deep(.exercise-reading-word-active) {
  color: inherit;
  text-shadow: none;
}

.exercise-reading-text :deep(.exercise-reading-word-border) {
  color: rgb(156 163 175);
  text-shadow: none;
}
</style>
