<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

import type {
  ExerciseAnswerState,
  ExerciseAnnotationPath,
  ExerciseAnnotationText,
  ExercisePoint,
  ExerciseQuestion,
} from "@/domain/exercises/types"
import { useExercisesStore } from "@/stores/exercises"

const props = defineProps<{
  question: ExerciseQuestion
  modelValue: ExerciseAnswerState
  disabled?: boolean
}>()

const emit = defineEmits<{
  "update:modelValue": [value: ExerciseAnswerState]
}>()

const { t } = useI18n()
const store = useExercisesStore()
const imageSrc = ref("")
const imageLoading = ref(false)
const imageError = ref(false)
const imageWidth = ref(0)
const imageHeight = ref(0)
const overlay = ref<SVGSVGElement | null>(null)
const annotationMode = ref<"draw" | "text">("draw")
const annotationText = ref("")
const draftPath = ref<ExercisePoint[]>([])
let activePointerId: number | null = null
let objectUrl: string | null = null

const isAnnotation = computed(() => props.question.type === 20)
const isDelineation = computed(() => props.question.type === 8)
const hotspot = computed(() => props.question.hotspot ?? null)
const imageRuntime = computed(() =>
  isAnnotation.value ? (props.question.annotation ?? null) : hotspot.value,
)
const sourceUrl = computed(() => imageRuntime.value?.imageUrl ?? "")
const hotspotPoints = computed(() => props.modelValue.hotspotPoints ?? [])
const annotationPaths = computed(() => props.modelValue.annotationPaths ?? [])
const annotationTexts = computed(() => props.modelValue.annotationTexts ?? [])
const maxClicks = computed(() => Math.max(1, hotspot.value?.maxClicks ?? 1))
const remainingClicks = computed(() => Math.max(0, maxClicks.value - hotspotPoints.value.length))
const canInteract = computed(
  () => !props.disabled && imageWidth.value > 0 && imageHeight.value > 0 && !imageError.value,
)
const viewBox = computed(() => `0 0 ${Math.max(1, imageWidth.value)} ${Math.max(1, imageHeight.value)}`)
const delineationPolyline = computed(() => hotspotPoints.value.map((point) => `${point.x},${point.y}`).join(" "))
const draftPolyline = computed(() => draftPath.value.map((point) => `${point.x},${point.y}`).join(" "))

function update(patch: Partial<ExerciseAnswerState>): void {
  emit("update:modelValue", { ...props.modelValue, ...patch })
}

function releaseObjectUrl(): void {
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrl = null
}

async function loadImage(): Promise<void> {
  releaseObjectUrl()
  imageSrc.value = ""
  imageWidth.value = 0
  imageHeight.value = 0
  imageError.value = false

  if (!sourceUrl.value) {
    imageError.value = true
    return
  }

  imageLoading.value = true
  try {
    const blob = await store.loadRuntimeImage(sourceUrl.value)
    if (!blob) {
      imageError.value = true
      return
    }

    objectUrl = URL.createObjectURL(blob)
    imageSrc.value = objectUrl
  } finally {
    imageLoading.value = false
  }
}

function handleImageLoad(event: Event): void {
  const image = event.target as HTMLImageElement
  imageWidth.value = image.naturalWidth
  imageHeight.value = image.naturalHeight
  imageError.value = image.naturalWidth <= 0 || image.naturalHeight <= 0
}

function pointFromPointer(event: PointerEvent): ExercisePoint | null {
  const target = overlay.value
  if (!target || imageWidth.value <= 0 || imageHeight.value <= 0) return null

  const rect = target.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null

  const x = Math.round(((event.clientX - rect.left) / rect.width) * imageWidth.value)
  const y = Math.round(((event.clientY - rect.top) / rect.height) * imageHeight.value)

  return {
    x: Math.min(imageWidth.value, Math.max(0, x)),
    y: Math.min(imageHeight.value, Math.max(0, y)),
  }
}

function addHotspotPoint(point: ExercisePoint): void {
  if (isDelineation.value) {
    update({ hotspotPoints: [...hotspotPoints.value, point] })
    return
  }

  if (hotspotPoints.value.length >= maxClicks.value) return
  update({ hotspotPoints: [...hotspotPoints.value, point] })
}

function addAnnotationText(point: ExercisePoint): void {
  const text = annotationText.value.trim()
  if (!text) return

  const next: ExerciseAnnotationText = { text, x: point.x, y: point.y }
  update({ annotationTexts: [...annotationTexts.value, next] })
  annotationText.value = ""
}

function onPointerDown(event: PointerEvent): void {
  if (!canInteract.value) return
  const point = pointFromPointer(event)
  if (!point) return

  event.preventDefault()

  if (!isAnnotation.value) {
    addHotspotPoint(point)
    return
  }

  if (annotationMode.value === "text") {
    addAnnotationText(point)
    return
  }

  activePointerId = event.pointerId
  overlay.value?.setPointerCapture(event.pointerId)
  draftPath.value = [point]
}

function onPointerMove(event: PointerEvent): void {
  if (!canInteract.value || !isAnnotation.value || annotationMode.value !== "draw") return
  if (activePointerId !== event.pointerId) return

  const point = pointFromPointer(event)
  const previous = draftPath.value[draftPath.value.length - 1]
  if (!point || !previous) return

  const distance = Math.hypot(point.x - previous.x, point.y - previous.y)
  if (distance < 3) return

  event.preventDefault()
  draftPath.value = [...draftPath.value, point]
}

function finishAnnotationPath(event: PointerEvent): void {
  if (activePointerId !== event.pointerId) return

  const points = draftPath.value
  if (points.length >= 2) {
    const path: ExerciseAnnotationPath = { points }
    update({ annotationPaths: [...annotationPaths.value, path] })
  }

  if (overlay.value?.hasPointerCapture(event.pointerId)) {
    overlay.value.releasePointerCapture(event.pointerId)
  }
  activePointerId = null
  draftPath.value = []
}

function undoHotspotPoint(): void {
  update({ hotspotPoints: hotspotPoints.value.slice(0, -1) })
}

function clearHotspot(): void {
  update({ hotspotPoints: [] })
}

function undoAnnotationPath(): void {
  update({ annotationPaths: annotationPaths.value.slice(0, -1) })
}

function undoAnnotationText(): void {
  update({ annotationTexts: annotationTexts.value.slice(0, -1) })
}

function clearAnnotation(): void {
  draftPath.value = []
  update({ annotationPaths: [], annotationTexts: [] })
}

watch(sourceUrl, loadImage, { immediate: true })
watch(
  () => props.question.id,
  () => {
    annotationMode.value = "draw"
    annotationText.value = ""
    draftPath.value = []
    activePointerId = null
  },
)

onBeforeUnmount(releaseObjectUrl)
</script>

<template>
  <div class="space-y-3">
    <div
      v-if="imageLoading"
      class="flex min-h-40 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600"
      role="status"
    >
      {{ t("exercises.imageQuestion.loading") }}
    </div>

    <div
      v-else-if="imageError"
      class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
      role="alert"
    >
      <p>{{ t("exercises.imageQuestion.loadError") }}</p>
      <button
        type="button"
        class="mt-3 min-h-touch rounded-xl border border-amber-700 px-4 font-semibold"
        :disabled="disabled"
        @click="loadImage"
      >
        {{ t("actions.retry") }}
      </button>
    </div>

    <template v-else-if="imageSrc">
      <p v-if="isAnnotation" class="text-sm text-slate-600">
        {{
          annotationMode === "draw"
            ? t("exercises.imageQuestion.annotationDrawHelp")
            : t("exercises.imageQuestion.annotationTextHelp")
        }}
      </p>
      <p v-else-if="isDelineation" class="text-sm text-slate-600">
        {{ t("exercises.imageQuestion.delineationHelp") }}
      </p>
      <p v-else class="text-sm text-slate-600">
        {{
          t("exercises.imageQuestion.hotspotHelp", {
            remaining: remainingClicks,
            total: maxClicks,
          })
        }}
      </p>

      <div
        class="relative mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
      >
        <img
          :src="imageSrc"
          :alt="imageRuntime?.imageName || t('exercises.imageQuestion.imageAlt')"
          class="block h-auto w-full select-none"
          draggable="false"
          @load="handleImageLoad"
          @error="imageError = true"
        />

        <svg
          v-if="imageWidth > 0 && imageHeight > 0"
          ref="overlay"
          class="absolute inset-0 h-full w-full touch-none text-chamilo-700"
          :class="disabled ? 'cursor-not-allowed' : 'cursor-crosshair'"
          :viewBox="viewBox"
          preserveAspectRatio="none"
          role="img"
          :aria-label="t('exercises.imageQuestion.interactionLayer')"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="finishAnnotationPath"
          @pointercancel="finishAnnotationPath"
        >
          <template v-if="!isAnnotation">
            <polygon
              v-if="isDelineation && hotspotPoints.length >= 3"
              :points="delineationPolyline"
              fill="currentColor"
              fill-opacity="0.12"
              stroke="currentColor"
              stroke-width="3"
            />
            <polyline
              v-else-if="isDelineation && hotspotPoints.length >= 2"
              :points="delineationPolyline"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
            />
            <g v-for="(point, index) in hotspotPoints" :key="`${point.x}-${point.y}-${index}`">
              <circle :cx="point.x" :cy="point.y" r="9" fill="currentColor" />
              <text
                :x="point.x"
                :y="point.y + 4"
                text-anchor="middle"
                font-size="11"
                font-weight="700"
                fill="white"
              >
                {{ index + 1 }}
              </text>
            </g>
          </template>

          <template v-else>
            <polyline
              v-for="(path, index) in annotationPaths"
              :key="`path-${index}`"
              :points="path.points.map((point) => `${point.x},${point.y}`).join(' ')"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="4"
            />
            <polyline
              v-if="draftPath.length >= 2"
              :points="draftPolyline"
              fill="none"
              stroke="currentColor"
              stroke-dasharray="8 6"
              stroke-linecap="round"
              stroke-width="4"
            />
            <g v-for="(item, index) in annotationTexts" :key="`text-${index}`">
              <circle :cx="item.x" :cy="item.y" r="5" fill="currentColor" />
              <text
                :x="item.x + 8"
                :y="item.y - 8"
                font-size="16"
                font-weight="600"
                fill="currentColor"
                stroke="white"
                stroke-width="3"
                paint-order="stroke"
              >
                {{ item.text }}
              </text>
            </g>
          </template>
        </svg>
      </div>

      <div v-if="isAnnotation" class="space-y-3 rounded-xl border border-slate-200 p-3">
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="min-h-touch rounded-xl border px-3 text-sm font-semibold"
            :class="
              annotationMode === 'draw'
                ? 'border-chamilo-700 bg-slate-50 text-chamilo-700'
                : 'border-slate-300 bg-white text-slate-700'
            "
            :disabled="disabled"
            @click="annotationMode = 'draw'"
          >
            <i class="pi pi-pencil mr-2" aria-hidden="true" />
            {{ t("exercises.imageQuestion.drawMode") }}
          </button>
          <button
            type="button"
            class="min-h-touch rounded-xl border px-3 text-sm font-semibold"
            :class="
              annotationMode === 'text'
                ? 'border-chamilo-700 bg-slate-50 text-chamilo-700'
                : 'border-slate-300 bg-white text-slate-700'
            "
            :disabled="disabled"
            @click="annotationMode = 'text'"
          >
            <i class="pi pi-font mr-2" aria-hidden="true" />
            {{ t("exercises.imageQuestion.textMode") }}
          </button>
        </div>

        <label v-if="annotationMode === 'text'" class="block text-sm font-medium text-slate-700">
          {{ t("exercises.imageQuestion.annotationText") }}
          <input
            v-model="annotationText"
            :name="`question-${question.id}-annotation-text`"
            type="text"
            maxlength="240"
            class="mt-1 min-h-touch w-full rounded-xl border border-slate-300 px-3"
            :disabled="disabled"
          />
        </label>

        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button
            type="button"
            class="min-h-touch rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-40"
            :disabled="disabled || annotationPaths.length === 0"
            @click="undoAnnotationPath"
          >
            {{ t("exercises.imageQuestion.undoPath") }}
          </button>
          <button
            type="button"
            class="min-h-touch rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-40"
            :disabled="disabled || annotationTexts.length === 0"
            @click="undoAnnotationText"
          >
            {{ t("exercises.imageQuestion.undoText") }}
          </button>
          <button
            type="button"
            class="col-span-2 min-h-touch rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-40 sm:col-span-1"
            :disabled="disabled || (annotationPaths.length === 0 && annotationTexts.length === 0)"
            @click="clearAnnotation"
          >
            {{ t("exercises.imageQuestion.clear") }}
          </button>
        </div>
      </div>

      <div v-else class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class="min-h-touch rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-40"
          :disabled="disabled || hotspotPoints.length === 0"
          @click="undoHotspotPoint"
        >
          <i class="pi pi-undo mr-2" aria-hidden="true" />
          {{ t("exercises.imageQuestion.undoPoint") }}
        </button>
        <button
          type="button"
          class="min-h-touch rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-40"
          :disabled="disabled || hotspotPoints.length === 0"
          @click="clearHotspot"
        >
          {{ t("exercises.imageQuestion.clear") }}
        </button>
      </div>
    </template>
  </div>
</template>
