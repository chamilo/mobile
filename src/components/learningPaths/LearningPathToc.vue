<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

import {
  isCompletedLearningPathStatus,
  isSupportedLearningPathItem,
} from "@/domain/learningPaths/contracts"
import type { LearningPathRuntimeItem } from "@/domain/learningPaths/types"

const props = defineProps<{
  items: LearningPathRuntimeItem[]
  currentItemId: number
  busy: boolean
  accordion: boolean
}>()

const emit = defineEmits<{
  select: [itemId: number]
}>()

const { t } = useI18n()
const expandedSections = ref<Set<number>>(new Set())

const itemById = computed(() => new Map(props.items.map((item) => [item.id, item] as const)))

function ancestorIds(item: LearningPathRuntimeItem): number[] {
  const ancestors: number[] = []
  const visited = new Set<number>()
  let parentId = item.parentId

  while (parentId > 0 && !visited.has(parentId)) {
    visited.add(parentId)
    ancestors.push(parentId)
    parentId = itemById.value.get(parentId)?.parentId ?? 0
  }

  return ancestors
}

function initializeExpandedSections(): void {
  const next = new Set<number>()

  for (const item of props.items) {
    if (item.isSection) {
      next.add(item.id)
    }
  }

  const current = itemById.value.get(props.currentItemId)

  if (current) {
    for (const ancestorId of ancestorIds(current)) {
      next.add(ancestorId)
    }
  }

  expandedSections.value = next
}

watch(() => [props.items, props.currentItemId] as const, initializeExpandedSections, {
  immediate: true,
  deep: true,
})

const visibleItems = computed(() =>
  props.items.filter((item) =>
    ancestorIds(item).every((ancestorId) => expandedSections.value.has(ancestorId)),
  ),
)

function toggleSection(item: LearningPathRuntimeItem): void {
  const next = new Set(expandedSections.value)

  if (next.has(item.id)) {
    next.delete(item.id)
  } else {
    if (props.accordion) {
      for (const candidate of props.items) {
        if (candidate.isSection && candidate.parentId === item.parentId) {
          next.delete(candidate.id)
        }
      }
    }

    next.add(item.id)
  }

  expandedSections.value = next
}

function statusIcon(item: LearningPathRuntimeItem): string {
  if (!item.available) {
    return "pi pi-lock"
  }

  if (isCompletedLearningPathStatus(item.status)) {
    return item.status.trim().toLowerCase() === "failed"
      ? "pi pi-times-circle"
      : "pi pi-check-circle"
  }

  if (item.id === props.currentItemId) {
    return "pi pi-play-circle"
  }

  return item.isSection ? "pi pi-folder" : "pi pi-circle"
}

function statusLabel(item: LearningPathRuntimeItem): string {
  if (!item.available) {
    return t("learningPaths.status.locked")
  }

  if (!isSupportedLearningPathItem(item) && !item.isSection) {
    return t("learningPaths.status.playerPending")
  }

  const normalizedStatus = item.status.trim().toLowerCase().replace(/[\s-]+/g, "_")
  const key = `learningPaths.status.${normalizedStatus}`

  return t(key)
}

function activate(item: LearningPathRuntimeItem): void {
  if (item.isSection) {
    toggleSection(item)
    return
  }

  if (!props.busy && isSupportedLearningPathItem(item)) {
    emit("select", item.id)
  }
}
</script>

<template>
  <div class="space-y-2">
    <button
      v-for="item in visibleItems"
      :key="item.id"
      type="button"
      class="flex min-h-touch w-full items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-left shadow-sm transition"
      :class="[
        item.id === currentItemId
          ? 'ring-chamilo-200 border-chamilo-500 ring-1'
          : 'border-slate-200',
        !item.available || (!item.isSection && !isSupportedLearningPathItem(item))
          ? 'opacity-65'
          : 'hover:border-chamilo-300',
      ]"
      :disabled="busy || !item.available || (!item.isSection && !isSupportedLearningPathItem(item))"
      :style="{ paddingLeft: `${12 + Math.min(item.level, 5) * 14}px` }"
      :aria-current="item.id === currentItemId ? 'step' : undefined"
      :aria-expanded="item.isSection ? expandedSections.has(item.id) : undefined"
      @click="activate(item)"
    >
      <i :class="statusIcon(item)" class="shrink-0 text-chamilo-700" aria-hidden="true" />

      <span class="min-w-0 flex-1">
        <span class="block break-words font-medium text-slate-900">
          {{ item.title }}
        </span>
        <span class="mt-0.5 block text-xs text-slate-500">
          {{ statusLabel(item) }}
        </span>
      </span>

      <i
        v-if="item.isSection"
        :class="expandedSections.has(item.id) ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
        class="text-xs text-slate-400"
        aria-hidden="true"
      />
      <i
        v-else-if="item.available && isSupportedLearningPathItem(item)"
        class="pi pi-chevron-right text-xs text-slate-400"
        aria-hidden="true"
      />
    </button>
  </div>
</template>
