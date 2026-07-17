<script setup lang="ts">
import { useI18n } from "vue-i18n"

import type { CampusProfile } from "@/domain/campus/types"

const props = defineProps<{
  campus: CampusProfile
  selected: boolean
  confirmRemoval: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  edit: [campus: CampusProfile]
  requestRemoval: [id: string]
  confirmRemoval: [id: string]
  cancelRemoval: []
}>()

const { t } = useI18n()
</script>

<template>
  <article
    class="rounded-2xl border bg-white p-5 shadow-sm"
    :class="selected ? 'border-chamilo-500 ring-2 ring-chamilo-100' : 'border-slate-200'"
  >
    <div class="flex items-start gap-3">
      <div
        class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-chamilo-50 text-chamilo-700"
        aria-hidden="true"
      >
        <i class="pi pi-building" />
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="break-words text-base font-semibold text-slate-900">
            {{ campus.displayName }}
          </h3>
          <span
            v-if="selected"
            class="rounded-full bg-chamilo-50 px-2 py-1 text-xs font-semibold text-chamilo-700"
          >
            {{ t("campus.selected") }}
          </span>
        </div>
        <p class="mt-1 break-all text-sm text-slate-600">{{ campus.baseUrl }}</p>
        <p class="mt-2 text-xs text-slate-500">
          {{ t(`campus.compatibility.${campus.compatibilityStatus}`) }}
        </p>
      </div>
    </div>

    <div v-if="confirmRemoval" class="mt-4 rounded-xl bg-red-50 p-3" role="alert">
      <p class="text-sm text-red-900">{{ t("campus.removeConfirmation") }}</p>
      <div class="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          class="min-h-touch rounded-xl border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700"
          @click="emit('cancelRemoval')"
        >
          {{ t("actions.cancel") }}
        </button>
        <button
          type="button"
          class="min-h-touch rounded-xl bg-red-700 px-3 py-2 font-semibold text-white"
          @click="emit('confirmRemoval', campus.id)"
        >
          {{ t("actions.remove") }}
        </button>
      </div>
    </div>

    <div v-else class="mt-4 grid grid-cols-3 gap-2">
      <button
        type="button"
        class="min-h-touch rounded-xl px-3 py-2 text-sm font-semibold"
        :class="
          selected ? 'cursor-default bg-chamilo-50 text-chamilo-700' : 'bg-chamilo-700 text-white'
        "
        :disabled="selected"
        @click="emit('select', campus.id)"
      >
        {{ selected ? t("campus.selected") : t("actions.select") }}
      </button>
      <button
        type="button"
        class="min-h-touch rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
        @click="emit('edit', props.campus)"
      >
        {{ t("actions.edit") }}
      </button>
      <button
        type="button"
        class="min-h-touch rounded-xl border border-red-300 px-3 py-2 text-sm font-medium text-red-700"
        @click="emit('requestRemoval', campus.id)"
      >
        {{ t("actions.remove") }}
      </button>
    </div>
  </article>
</template>
