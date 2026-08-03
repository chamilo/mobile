<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"

import type { SurveyQuestion } from "@/domain/surveys/types"

const { t } = useI18n()

const props = defineProps<{
  question: SurveyQuestion
  modelValue: unknown
  otherValue: string
  disabled: boolean
  error: string
  namePrefix: string
}>()

const emit = defineEmits<{
  "update:modelValue": [value: unknown]
  "update:otherValue": [value: string]
}>()

const selectedIds = computed<number[]>(() => {
  if (Array.isArray(props.modelValue)) {
    return props.modelValue.map(Number).filter((value) => Number.isInteger(value) && value > 0)
  }

  const value = Number(props.modelValue)
  return Number.isInteger(value) && value > 0 ? [value] : []
})

const selectedId = computed(() => selectedIds.value[0] ?? 0)
const scoreValues = computed<Record<string, number | string>>(() => {
  if (
    !props.modelValue ||
    typeof props.modelValue !== "object" ||
    Array.isArray(props.modelValue)
  ) {
    return {}
  }

  return props.modelValue as Record<string, number | string>
})
const selectedOther = computed(() =>
  props.question.options.some((option) => option.isOther && option.id === selectedId.value),
)

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value
}

function updateSingle(optionId: number): void {
  emit("update:modelValue", optionId)

  if (!props.question.options.some((option) => option.id === optionId && option.isOther)) {
    emit("update:otherValue", "")
  }
}

function toggleMultiple(optionId: number, checked: boolean): void {
  const next = new Set(selectedIds.value)
  if (checked) next.add(optionId)
  else next.delete(optionId)
  emit("update:modelValue", [...next])
}

function toggleMultipleFromEvent(optionId: number, event: Event): void {
  toggleMultiple(optionId, (event.target as HTMLInputElement).checked)
}

function updateScore(optionId: number, rawValue: string): void {
  const next = { ...scoreValues.value }

  if (rawValue.trim() === "") delete next[String(optionId)]
  else next[String(optionId)] = Number(rawValue)

  emit("update:modelValue", next)
}
</script>

<template>
  <div class="mt-4 space-y-3">
    <textarea
      v-if="question.type === 'open' || question.type === 'comment'"
      :id="`${namePrefix}-${question.id}`"
      :name="`${namePrefix}[${question.id}]`"
      :value="typeof modelValue === 'string' ? modelValue : ''"
      rows="4"
      class="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-chamilo-600 focus:ring-2 focus:ring-chamilo-100 disabled:bg-slate-100"
      :disabled="disabled"
      :aria-invalid="Boolean(error)"
      @input="$emit('update:modelValue', inputValue($event))"
    />

    <select
      v-else-if="question.type === 'dropdown'"
      :id="`${namePrefix}-${question.id}`"
      :name="`${namePrefix}[${question.id}]`"
      class="min-h-touch w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-chamilo-600 focus:ring-2 focus:ring-chamilo-100 disabled:bg-slate-100"
      :value="selectedId || ''"
      :disabled="disabled"
      :aria-invalid="Boolean(error)"
      @change="updateSingle(Number(inputValue($event)))"
    >
      <option value="">{{ t("surveys.detail.selectOption") }}</option>
      <option v-for="option in question.options" :key="option.id" :value="option.id">
        {{ option.label }}
      </option>
    </select>

    <div v-else-if="question.type === 'multipleresponse'" class="space-y-2">
      <label
        v-for="option in question.options"
        :key="option.id"
        class="flex min-h-touch items-center gap-3 rounded-xl border border-slate-200 px-3 py-2"
      >
        <input
          type="checkbox"
          :name="`${namePrefix}[${question.id}][]`"
          :value="option.id"
          :checked="selectedIds.includes(option.id)"
          :disabled="disabled"
          @change="toggleMultipleFromEvent(option.id, $event)"
        />
        <span class="text-sm text-slate-800">{{ option.label }}</span>
      </label>
    </div>

    <div v-else-if="question.type === 'score'" class="space-y-2">
      <label
        v-for="option in question.options"
        :key="option.id"
        class="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_7rem] sm:items-center"
      >
        <span class="text-sm text-slate-800">{{ option.label }}</span>
        <input
          type="number"
          :name="`${namePrefix}[${question.id}][${option.id}]`"
          min="0"
          :max="question.maxValue ?? undefined"
          :value="scoreValues[String(option.id)] ?? ''"
          class="min-h-touch rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-chamilo-600 focus:ring-2 focus:ring-chamilo-100 disabled:bg-slate-100"
          :disabled="disabled"
          @input="updateScore(option.id, inputValue($event))"
        />
      </label>
    </div>

    <div v-else-if="question.options.length" class="space-y-2">
      <label
        v-for="option in question.options"
        :key="option.id"
        class="flex min-h-touch items-center gap-3 rounded-xl border border-slate-200 px-3 py-2"
      >
        <input
          type="radio"
          :name="`${namePrefix}[${question.id}]`"
          :value="option.id"
          :checked="selectedId === option.id"
          :disabled="disabled"
          @change="updateSingle(option.id)"
        />
        <span class="text-sm text-slate-800">{{ option.label }}</span>
      </label>

      <input
        v-if="question.type === 'multiplechoiceother' && selectedOther"
        type="text"
        :name="`${namePrefix}[other_${question.id}]`"
        :value="otherValue"
        class="min-h-touch w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-chamilo-600 focus:ring-2 focus:ring-chamilo-100 disabled:bg-slate-100"
        :placeholder="t('surveys.detail.otherAnswerPlaceholder')"
        :disabled="disabled"
        @input="$emit('update:otherValue', inputValue($event))"
      />
    </div>

    <p v-else class="text-sm font-medium text-amber-800">
      {{ t("surveys.detail.unsupportedAnswerControl") }}
    </p>

    <p v-if="error" class="text-sm font-medium text-red-700" role="alert">
      {{ t("surveys.detail.questionRequired") }}
    </p>
  </div>
</template>
