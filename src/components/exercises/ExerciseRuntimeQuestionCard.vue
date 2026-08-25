<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

import ExerciseQuestionField from "@/components/exercises/ExerciseQuestionField.vue"
import { isSupportedExerciseQuestion } from "@/domain/exercises/answers"
import type { ExerciseAnswerState, ExerciseQuestion } from "@/domain/exercises/types"
import { createDocumentBlobPresenter } from "@/services/documents/DocumentBlobPresenter"
import { useExercisesStore } from "@/stores/exercises"

const props = defineProps<{
  question: ExerciseQuestion
  answer: ExerciseAnswerState
  disabled?: boolean
  showTitle?: boolean
  reviewEnabled?: boolean
  teacherPreview?: boolean
  pendingFile?: File | null
}>()

const emit = defineEmits<{
  updateAnswer: [value: ExerciseAnswerState]
  selectFile: [file: File | null]
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

let annotationImageObjectUrl: string | null = null
let annotationImageLoadSequence = 0
let hotspotImageObjectUrl: string | null = null
let hotspotImageLoadSequence = 0

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
  releaseAnnotationImage()
  releaseHotspotImage()
})
</script>

<template>
  <section class="rounded-2xl bg-white p-4 shadow-sm">
    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {{ question.typeLabel }}
    </p>
    <h2 v-if="showTitle !== false" class="mt-1 text-lg font-semibold text-slate-900">
      {{ question.title }}
    </h2>
    <p v-if="question.description && question.type !== 21" class="mt-2 text-sm text-slate-600">
      {{ question.description }}
    </p>

    <ExerciseQuestionField
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
      v-if="reviewEnabled && !teacherPreview"
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
