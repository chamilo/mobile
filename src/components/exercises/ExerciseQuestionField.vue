<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"

import { answerKind } from "@/domain/exercises/answers"
import type { ExerciseAnswerState, ExerciseQuestion } from "@/domain/exercises/types"

const props = defineProps<{
  question: ExerciseQuestion
  modelValue: ExerciseAnswerState
  disabled?: boolean
}>()

const emit = defineEmits<{
  "update:modelValue": [value: ExerciseAnswerState]
}>()

const { t } = useI18n()
const kind = computed(() => answerKind(props.question))

function update(patch: Partial<ExerciseAnswerState>): void {
  emit("update:modelValue", { ...props.modelValue, ...patch })
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
</script>

<template>
  <fieldset :disabled="disabled" class="space-y-4">
    <legend class="sr-only">{{ plainText(question.title) }}</legend>

    <div v-if="kind === 'radio'" class="space-y-3">
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
