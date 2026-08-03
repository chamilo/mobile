<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"

import type { SurveyProfileField } from "@/domain/surveys/types"

const { t } = useI18n()

const props = defineProps<{
  field: SurveyProfileField
  modelValue: string | string[]
  disabled: boolean
  error: string
}>()

const emit = defineEmits<{
  "update:modelValue": [value: string | string[]]
}>()

const multipleValue = computed(() =>
  Array.isArray(props.modelValue) ? props.modelValue : props.modelValue ? [props.modelValue] : [],
)

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value
}

function selectMultiple(event: Event): void {
  const select = event.target as HTMLSelectElement
  emit(
    "update:modelValue",
    [...select.selectedOptions].map((option) => option.value),
  )
}
</script>

<template>
  <div class="space-y-2">
    <label :for="`survey-profile-${field.key}`" class="block text-sm font-semibold text-slate-800">
      {{ field.label }}
      <span v-if="field.required" class="text-red-700">*</span>
    </label>

    <p v-if="field.readOnly" class="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
      {{ Array.isArray(modelValue) ? modelValue.join(", ") : modelValue }}
    </p>

    <textarea
      v-else-if="field.type === 'textarea'"
      :id="`survey-profile-${field.key}`"
      :name="`profileValues[${field.key}]`"
      rows="3"
      :value="Array.isArray(modelValue) ? modelValue.join(', ') : modelValue"
      class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-chamilo-600 focus:ring-2 focus:ring-chamilo-100"
      :disabled="disabled"
      :aria-invalid="Boolean(error)"
      @input="$emit('update:modelValue', inputValue($event))"
    />

    <select
      v-else-if="field.type === 'select'"
      :id="`survey-profile-${field.key}`"
      :name="`profileValues[${field.key}]`"
      :value="Array.isArray(modelValue) ? (modelValue[0] ?? '') : modelValue"
      class="min-h-touch w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-chamilo-600 focus:ring-2 focus:ring-chamilo-100"
      :disabled="disabled"
      :aria-invalid="Boolean(error)"
      @change="$emit('update:modelValue', inputValue($event))"
    >
      <option value="">{{ t("surveys.detail.selectOption") }}</option>
      <option v-for="option in field.options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <select
      v-else-if="field.type === 'multiselect'"
      :id="`survey-profile-${field.key}`"
      :name="`profileValues[${field.key}][]`"
      multiple
      :value="multipleValue"
      class="min-h-32 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-chamilo-600 focus:ring-2 focus:ring-chamilo-100"
      :disabled="disabled"
      :aria-invalid="Boolean(error)"
      @change="selectMultiple"
    >
      <option v-for="option in field.options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <input
      v-else
      :id="`survey-profile-${field.key}`"
      :name="`profileValues[${field.key}]`"
      :type="field.inputType || 'text'"
      :value="Array.isArray(modelValue) ? modelValue.join(', ') : modelValue"
      class="min-h-touch w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-chamilo-600 focus:ring-2 focus:ring-chamilo-100"
      :disabled="disabled"
      :aria-invalid="Boolean(error)"
      @input="$emit('update:modelValue', inputValue($event))"
    />

    <p v-if="field.helpText" class="text-xs text-slate-500">{{ field.helpText }}</p>
    <p v-if="error" class="text-sm font-medium text-red-700" role="alert">
      {{ t("surveys.detail.profileFieldRequired") }}
    </p>
  </div>
</template>
