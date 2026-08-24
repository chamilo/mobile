<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue"

import {
  parseExerciseRichAnswerContent,
  type ExerciseRichAnswerSegment,
} from "@/domain/exercises/richAnswerContent"
import { useExercisesStore } from "@/stores/exercises"

const props = defineProps<{
  html: string
  fallbackImageAlt: string
}>()

const store = useExercisesStore()
const imageSources = ref<Record<number, string | null>>({})
let objectUrls: string[] = []
let loadGeneration = 0

const segments = computed<ExerciseRichAnswerSegment[]>(() =>
  parseExerciseRichAnswerContent(props.html, props.fallbackImageAlt),
)

function revokeObjectUrls(): void {
  for (const url of objectUrls) URL.revokeObjectURL(url)
  objectUrls = []
}

async function resolveImages(): Promise<void> {
  const generation = ++loadGeneration
  revokeObjectUrls()
  imageSources.value = {}

  const next: Record<number, string | null> = {}

  await Promise.all(
    segments.value.map(async (segment, index) => {
      if (segment.type !== "image") return

      if (/^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(segment.src)) {
        next[index] = segment.src
        return
      }

      const blob = await store.loadRuntimeImage(segment.src)
      if (!blob || generation !== loadGeneration) {
        next[index] = null
        return
      }

      const url = URL.createObjectURL(blob)
      objectUrls.push(url)
      next[index] = url
    }),
  )

  if (generation === loadGeneration) imageSources.value = next
}

watch(
  () => [props.html, props.fallbackImageAlt],
  () => void resolveImages(),
  { immediate: true },
)

onBeforeUnmount(() => {
  loadGeneration += 1
  revokeObjectUrls()
})
</script>

<template>
  <span class="min-w-0 flex-1">
    <template v-for="(segment, index) in segments" :key="`${segment.type}-${index}`">
      <span v-if="segment.type === 'text'">{{ segment.text }}</span>
      <br v-else-if="segment.type === 'break'" />
      <template v-else>
        <img
          v-if="imageSources[index]"
          :src="imageSources[index] ?? undefined"
          :alt="segment.alt"
          class="my-2 h-auto max-h-64 max-w-full rounded-lg object-contain"
        />
        <span v-else-if="imageSources[index] === null" class="text-sm text-slate-600">
          {{ segment.alt }}
        </span>
        <span v-else class="sr-only" aria-live="polite">{{ segment.alt }}</span>
      </template>
    </template>
  </span>
</template>
