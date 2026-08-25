<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

import ExerciseAudioRecorder from "@/components/exercises/ExerciseAudioRecorder.vue"
import { answerKind } from "@/domain/exercises/answers"
import { exerciseFileAccept } from "@/domain/exercises/fileAnswers"
import {
  exerciseHotspotPointFromClientCoordinates,
  exerciseHotspotPointPercent,
} from "@/domain/exercises/hotspot"
import type { ExerciseAnswerState, ExerciseQuestion } from "@/domain/exercises/types"

const props = defineProps<{
  question: ExerciseQuestion
  modelValue: ExerciseAnswerState
  disabled?: boolean
  hotspotImageSrc?: string | null
  hotspotImageLoading?: boolean
  hotspotImageError?: boolean
  pendingFileName?: string | null
}>()

const emit = defineEmits<{
  "update:modelValue": [value: ExerciseAnswerState]
  retryHotspotImage: []
  selectAnswerFile: [file: File | null]
}>()

const { t } = useI18n()
const kind = computed(() => answerKind(props.question))
const answerFileInput = ref<HTMLInputElement | null>(null)

function update(patch: Partial<ExerciseAnswerState>): void {
  emit("update:modelValue", { ...props.modelValue, ...patch })
}

function selectAnswerFile(event: Event): void {
  const input = event.target as HTMLInputElement
  emit("selectAnswerFile", input.files?.[0] ?? null)
}

function selectRecordedAudio(file: File): void {
  emit("selectAnswerFile", file)
}

function plainText(value: string): string {
  const container = document.createElement("div")
  container.innerHTML = value
  return container.textContent ?? ""
}

function toggleChoice(choiceId: number, checked: boolean): void {
  const choices = checked
    ? [...new Set([...props.modelValue.choices, choiceId])]
    : props.modelValue.choices.filter((id) => id !== choiceId)
  update({ choices })
}

function updateNumericMap(
  field: "trueFalse" | "degreeCertainty" | "matching",
  key: number,
  value: string,
): void {
  update({
    [field]: {
      ...props.modelValue[field],
      [key]: Number(value),
    },
  })
}

function updateBlank(position: number, value: string): void {
  update({ blanks: { ...props.modelValue.blanks, [position]: value } })
}

function trueFalseAnswerOptions() {
  return props.question.type === 22
    ? props.question.trueFalseOptions.filter(
        (option) => option.position === 1 || option.position === 2,
      )
    : props.question.trueFalseOptions
}

function certaintyOptions() {
  return props.question.trueFalseOptions.filter(
    (option) => option.position >= 3 && option.position < 9,
  )
}

function moveOrder(index: number, direction: -1 | 1): void {
  const target = index + direction
  if (target < 0 || target >= props.modelValue.order.length) return
  const order = [...props.modelValue.order]
  const currentValue = order[index]
  const targetValue = order[target]
  if (currentValue === undefined || targetValue === undefined) return
  order[index] = targetValue
  order[target] = currentValue
  update({ order })
}

const orderedItems = computed(() => {
  const items = new Map((props.question.draggable?.items ?? []).map((item) => [item.id, item]))
  return props.modelValue.order.map((id) => items.get(id)).filter(Boolean)
})

const hotspotImage = ref<HTMLImageElement | null>(null)
const hotspotNaturalWidth = ref(0)
const hotspotNaturalHeight = ref(0)

const hotspotPoints = computed(() => props.modelValue.hotspotPoints ?? [])
const hotspotMaxClicks = computed(() => Math.max(1, props.question.hotspot?.maxClicks ?? 1))
const hotspotDelineation = computed(() => props.question.hotspot?.delineation === true)
const hotspotPointsRemaining = computed(() =>
  hotspotDelineation.value
    ? null
    : Math.max(0, hotspotMaxClicks.value - hotspotPoints.value.length),
)
const hotspotPolylinePoints = computed(() =>
  hotspotPoints.value.map((point) => `${point.x},${point.y}`).join(" "),
)

function resetHotspotImageGeometry(): void {
  hotspotNaturalWidth.value = 0
  hotspotNaturalHeight.value = 0
}

function handleHotspotImageLoad(event: Event): void {
  const image = event.currentTarget as HTMLImageElement
  hotspotImage.value = image
  hotspotNaturalWidth.value = image.naturalWidth
  hotspotNaturalHeight.value = image.naturalHeight
}

function handleHotspotPointer(event: PointerEvent): void {
  if (props.disabled || !props.question.hotspot || !hotspotImage.value) return
  if (event.pointerType === "mouse" && event.button !== 0) return
  if (!hotspotDelineation.value && hotspotPoints.value.length >= hotspotMaxClicks.value) {
    return
  }

  const image = hotspotImage.value
  const rect = image.getBoundingClientRect()
  const point = exerciseHotspotPointFromClientCoordinates(event.clientX, event.clientY, {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
  })

  if (!point) return

  update({ hotspotPoints: [...hotspotPoints.value, point] })
}

function undoHotspotPoint(): void {
  update({ hotspotPoints: hotspotPoints.value.slice(0, -1) })
}

function resetHotspotPoints(): void {
  update({ hotspotPoints: [] })
}

function hotspotMarkerStyle(point: ExerciseAnswerState["hotspotPoints"][number]) {
  return exerciseHotspotPointPercent(point, hotspotNaturalWidth.value, hotspotNaturalHeight.value)
}

watch(
  () => [props.question.id, props.hotspotImageSrc],
  () => {
    hotspotImage.value = null
    resetHotspotImageGeometry()
  },
)

watch(
  () => [props.question.id, props.pendingFileName],
  () => {
    if (!props.pendingFileName && answerFileInput.value) answerFileInput.value.value = ""
  },
)
</script>

<template>
  <fieldset :disabled="disabled" class="space-y-4">
    <legend class="sr-only">{{ plainText(question.title) }}</legend>

    <div v-if="kind === 'reading'" class="space-y-5">
      <section
        class="rounded-xl border border-slate-200 bg-slate-50 p-4"
        :aria-labelledby="`question-${question.id}-reading-title`"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p :id="`question-${question.id}-reading-title`" class="font-medium text-slate-900">
            {{ t("exercises.readingPassage") }}
          </p>
          <span
            v-if="(question.reading?.speed ?? 0) > 0"
            class="text-xs font-medium text-slate-500"
          >
            {{ t("exercises.readingSpeed", { speed: question.reading?.speed ?? 0 }) }}
          </span>
        </div>

        <p class="mt-3 whitespace-pre-line text-base leading-7 text-slate-800">
          {{ question.reading?.text || question.description }}
        </p>
      </section>

      <div class="space-y-3">
        <label
          v-for="choice in question.choices"
          :key="choice.id"
          class="flex min-h-touch items-start gap-3 rounded-xl border border-slate-200 p-3"
        >
          <input
            :name="`question-${question.id}`"
            type="radio"
            :value="choice.id"
            :checked="modelValue.choice === choice.id"
            class="mt-1"
            @change="update({ choice: choice.id })"
          />
          <span>{{ plainText(choice.answer) }}</span>
        </label>
      </div>
    </div>

    <div v-else-if="kind === 'radio'" class="space-y-3">
      <label
        v-for="choice in question.choices"
        :key="choice.id"
        class="flex min-h-touch items-start gap-3 rounded-xl border border-slate-200 p-3"
      >
        <input
          :name="`question-${question.id}`"
          type="radio"
          :value="choice.id"
          :checked="modelValue.choice === choice.id"
          class="mt-1"
          @change="update({ choice: choice.id })"
        />
        <span>{{ plainText(choice.answer) }}</span>
      </label>
    </div>

    <div v-else-if="kind === 'checkbox'" class="space-y-3">
      <label
        v-for="choice in question.choices"
        :key="choice.id"
        class="flex min-h-touch items-start gap-3 rounded-xl border border-slate-200 p-3"
      >
        <input
          :name="`question-${question.id}-${choice.id}`"
          type="checkbox"
          :checked="modelValue.choices.includes(choice.id)"
          class="mt-1"
          @change="toggleChoice(choice.id, ($event.target as HTMLInputElement).checked)"
        />
        <span>{{ plainText(choice.answer) }}</span>
      </label>
    </div>

    <div v-else-if="kind === 'true-false'" class="space-y-3">
      <div
        v-for="choice in question.choices"
        :key="choice.id"
        class="rounded-xl border border-slate-200 p-3"
      >
        <p class="font-medium text-slate-900">{{ plainText(choice.answer) }}</p>
        <label class="mt-3 block text-sm font-medium text-slate-700">
          {{ t("exercises.answer") }}
          <select
            :name="`question-${question.id}-answer-${choice.id}`"
            :value="modelValue.trueFalse[choice.id] ?? ''"
            class="mt-1 min-h-touch w-full rounded-xl border border-slate-300 bg-white px-3"
            @change="
              updateNumericMap('trueFalse', choice.id, ($event.target as HTMLSelectElement).value)
            "
          >
            <option value="" disabled>{{ t("exercises.selectAnswer") }}</option>
            <option v-for="option in trueFalseAnswerOptions()" :key="option.id" :value="option.id">
              {{ option.title }}
            </option>
          </select>
        </label>
        <label v-if="question.type === 22" class="mt-3 block text-sm font-medium text-slate-700">
          {{ t("exercises.certainty") }}
          <select
            :name="`question-${question.id}-certainty-${choice.id}`"
            :value="modelValue.degreeCertainty[choice.id] ?? ''"
            class="mt-1 min-h-touch w-full rounded-xl border border-slate-300 bg-white px-3"
            @change="
              updateNumericMap(
                'degreeCertainty',
                choice.id,
                ($event.target as HTMLSelectElement).value,
              )
            "
          >
            <option value="" disabled>
              {{ t("exercises.selectCertainty") }}
            </option>
            <option v-for="option in certaintyOptions()" :key="option.id" :value="option.id">
              {{ option.title }}
            </option>
          </select>
        </label>
      </div>
    </div>

    <div v-else-if="kind === 'fill-blanks'" class="space-y-3">
      <template v-for="(segment, index) in question.fillBlanks?.segments ?? []" :key="index">
        <span v-if="segment.type === 'text'">{{ segment.text }}</span>
        <label v-else class="block">
          <span class="sr-only">{{ t("exercises.blank", { number: segment.position }) }}</span>
          <input
            :name="`question-${question.id}-blank-${segment.position}`"
            type="text"
            :value="modelValue.blanks[segment.position ?? 0] ?? ''"
            class="min-h-touch w-full rounded-xl border border-slate-300 px-3"
            @input="updateBlank(segment.position ?? 0, ($event.target as HTMLInputElement).value)"
          />
        </label>
      </template>
    </div>

    <div v-else-if="kind === 'matching'" class="space-y-3">
      <label
        v-for="prompt in question.matching?.prompts ?? []"
        :key="prompt.id"
        class="block rounded-xl border border-slate-200 p-3"
      >
        <span class="font-medium text-slate-900">{{ plainText(prompt.answer) }}</span>
        <select
          :name="`question-${question.id}-match-${prompt.id}`"
          :value="modelValue.matching[prompt.id] ?? ''"
          class="mt-2 min-h-touch w-full rounded-xl border border-slate-300 bg-white px-3"
          @change="
            updateNumericMap('matching', prompt.id, ($event.target as HTMLSelectElement).value)
          "
        >
          <option value="" disabled>{{ t("exercises.selectMatch") }}</option>
          <option
            v-for="option in question.matching?.options ?? []"
            :key="option.id"
            :value="option.id"
          >
            {{ plainText(option.answer) }}
          </option>
        </select>
      </label>
    </div>

    <ol v-else-if="kind === 'ordering'" class="space-y-3">
      <li
        v-for="(item, index) in orderedItems"
        :key="item?.id"
        class="flex items-center gap-2 rounded-xl border border-slate-200 p-3"
      >
        <span class="min-w-0 flex-1">{{ index + 1 }}. {{ plainText(item?.answer ?? "") }}</span>
        <button
          type="button"
          class="min-h-touch min-w-touch rounded-lg border border-slate-300"
          :aria-label="t('exercises.moveUp')"
          :disabled="index === 0"
          @click="moveOrder(index, -1)"
        >
          <i class="pi pi-arrow-up" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="min-h-touch min-w-touch rounded-lg border border-slate-300"
          :aria-label="t('exercises.moveDown')"
          :disabled="index === orderedItems.length - 1"
          @click="moveOrder(index, 1)"
        >
          <i class="pi pi-arrow-down" aria-hidden="true" />
        </button>
      </li>
    </ol>

    <div v-else-if="kind === 'hotspot'" class="space-y-4">
      <p class="text-sm text-slate-700">
        {{
          hotspotDelineation
            ? t("exercises.hotspot.delineationInstructions")
            : t("exercises.hotspot.pointInstructions", { count: hotspotMaxClicks })
        }}
      </p>

      <div
        v-if="hotspotImageLoading"
        class="flex min-h-48 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
        role="status"
      >
        {{ t("exercises.hotspot.loadingImage") }}
      </div>

      <div
        v-else-if="hotspotImageError || !hotspotImageSrc"
        class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        role="alert"
      >
        <p>{{ t("exercises.hotspot.imageError") }}</p>
        <button
          type="button"
          class="mt-3 min-h-touch rounded-xl border border-amber-700 bg-white px-4 font-semibold text-amber-900"
          :disabled="disabled"
          @click="emit('retryHotspotImage')"
        >
          {{ t("actions.retry") }}
        </button>
      </div>

      <div v-else class="overflow-x-auto">
        <div
          class="relative inline-block max-w-full touch-manipulation overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
          :class="disabled ? 'cursor-default opacity-75' : 'cursor-crosshair'"
          @pointerdown="handleHotspotPointer"
        >
          <img
            ref="hotspotImage"
            :src="hotspotImageSrc"
            :alt="question.hotspot?.imageName || plainText(question.title)"
            class="block max-h-[70vh] max-w-full select-none"
            draggable="false"
            @load="handleHotspotImageLoad"
          />

          <svg
            v-if="hotspotNaturalWidth > 0 && hotspotNaturalHeight > 0 && hotspotDelineation"
            class="pointer-events-none absolute inset-0 h-full w-full"
            :viewBox="`0 0 ${hotspotNaturalWidth} ${hotspotNaturalHeight}`"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polygon
              v-if="hotspotPoints.length >= 3"
              :points="hotspotPolylinePoints"
              class="fill-chamilo-500/20 stroke-chamilo-700"
              vector-effect="non-scaling-stroke"
              stroke-width="2"
            />
            <polyline
              v-else-if="hotspotPoints.length >= 2"
              :points="hotspotPolylinePoints"
              class="fill-none stroke-chamilo-700"
              vector-effect="non-scaling-stroke"
              stroke-width="2"
            />
          </svg>

          <span
            v-for="(point, index) in hotspotPoints"
            :key="`${index}-${point.x}-${point.y}`"
            class="pointer-events-none absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-chamilo-700 text-xs font-bold text-white shadow"
            :style="hotspotMarkerStyle(point)"
            aria-hidden="true"
          >
            {{ index + 1 }}
          </span>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <span aria-live="polite">
          {{
            hotspotDelineation
              ? t("exercises.hotspot.verticesSelected", { count: hotspotPoints.length })
              : t("exercises.hotspot.pointsSelected", {
                  selected: hotspotPoints.length,
                  total: hotspotMaxClicks,
                })
          }}
        </span>
        <span v-if="hotspotPointsRemaining !== null && hotspotPointsRemaining > 0">
          {{ t("exercises.hotspot.pointsRemaining", { count: hotspotPointsRemaining }) }}
        </span>
      </div>

      <p
        v-if="hotspotDelineation && hotspotPoints.length > 0 && hotspotPoints.length < 3"
        class="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
      >
        {{ t("exercises.hotspot.minimumVertices") }}
      </p>

      <div class="grid grid-cols-2 gap-3">
        <button
          type="button"
          class="min-h-touch rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-700 disabled:opacity-40"
          :disabled="disabled || hotspotPoints.length === 0"
          @click="undoHotspotPoint"
        >
          <i class="pi pi-undo mr-2" aria-hidden="true" />
          {{ t("exercises.hotspot.undoPoint") }}
        </button>
        <button
          type="button"
          class="min-h-touch rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-700 disabled:opacity-40"
          :disabled="disabled || hotspotPoints.length === 0"
          @click="resetHotspotPoints"
        >
          <i class="pi pi-refresh mr-2" aria-hidden="true" />
          {{ t("exercises.hotspot.reset") }}
        </button>
      </div>
    </div>

    <div v-else-if="kind === 'file' || kind === 'oral'" class="space-y-4">
      <ExerciseAudioRecorder
        v-if="kind === 'oral'"
        :question-id="question.id"
        :disabled="disabled"
        @recorded="selectRecordedAudio"
      />

      <label class="block rounded-xl border border-slate-200 p-3">
        <span class="text-sm font-medium text-slate-800">
          {{
            kind === "oral"
              ? t("exercises.fileAnswer.chooseAudio")
              : t("exercises.fileAnswer.chooseFile")
          }}
        </span>
        <input
          :key="`question-${question.id}-file`"
          ref="answerFileInput"
          :name="`question-${question.id}-file`"
          type="file"
          :accept="exerciseFileAccept(question.type)"
          class="mt-2 block w-full text-sm text-slate-700"
          :disabled="disabled"
          @change="selectAnswerFile"
        />
      </label>

      <div
        v-if="pendingFileName"
        class="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900"
      >
        {{ t("exercises.fileAnswer.selected", { name: pendingFileName }) }}
      </div>

      <div
        v-if="(modelValue.uploadedFiles?.length ?? 0) > 0"
        class="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
      >
        <p class="font-semibold">{{ t("exercises.fileAnswer.savedFiles") }}</p>
        <p v-for="file in modelValue.uploadedFiles ?? []" :key="file.id">
          {{ file.name }}
        </p>
      </div>

      <p v-if="kind === 'oral'" class="text-xs text-slate-500">
        {{ t("exercises.fileAnswer.oralFormats") }}
      </p>
    </div>

    <label v-else-if="kind === 'dropdown'" class="block">
      <span class="sr-only">{{ t("exercises.selectAnswer") }}</span>
      <select
        :name="`question-${question.id}`"
        :value="modelValue.dropdown ?? ''"
        class="min-h-touch w-full rounded-xl border border-slate-300 bg-white px-3"
        @change="
          update({
            dropdown: Number(($event.target as HTMLSelectElement).value),
          })
        "
      >
        <option value="" disabled>{{ t("exercises.selectAnswer") }}</option>
        <option
          v-for="option in question.dropdown?.options ?? []"
          :key="option.id"
          :value="option.id"
        >
          {{ plainText(option.answer) }}
        </option>
      </select>
    </label>

    <label v-else-if="kind === 'calculated'" class="block">
      <span class="text-sm font-medium text-slate-700">
        {{ question.calculated?.text }}
      </span>
      <input
        :name="`question-${question.id}`"
        type="text"
        inputmode="decimal"
        :value="modelValue.calculated"
        class="mt-2 min-h-touch w-full rounded-xl border border-slate-300 px-3"
        @input="update({ calculated: ($event.target as HTMLInputElement).value })"
      />
    </label>

    <label v-else-if="kind === 'text'" class="block">
      <span class="sr-only">{{ t("exercises.openAnswer") }}</span>
      <textarea
        :name="`question-${question.id}`"
        rows="6"
        :value="modelValue.text"
        class="w-full rounded-xl border border-slate-300 p-3"
        @input="update({ text: ($event.target as HTMLTextAreaElement).value })"
      />
    </label>

    <div
      v-else
      class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
      role="alert"
    >
      {{ t("exercises.unsupportedQuestion") }}
    </div>
  </fieldset>
</template>
