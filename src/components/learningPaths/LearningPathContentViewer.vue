<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

import type { LearningPathRuntimeItem } from "@/domain/learningPaths/types"

const props = defineProps<{
  blob: Blob
  item: LearningPathRuntimeItem
}>()

const emit = defineEmits<{
  openExternal: []
  download: []
}>()

const { t } = useI18n()
const objectUrl = ref("")
const textContent = ref("")

function extension(filename: string): string {
  const match = filename
    .trim()
    .toLowerCase()
    .match(/\.([a-z0-9]+)$/)

  return match?.[1] ?? ""
}

const mimeType = computed(() => props.blob.type.trim().toLowerCase())
const fileExtension = computed(() => extension(props.item.title))

const viewerKind = computed<"image" | "video" | "audio" | "text" | "frame" | "unsupported">(() => {
  if (mimeType.value.startsWith("image/")) {
    return "image"
  }

  if (mimeType.value.startsWith("video/")) {
    return "video"
  }

  if (mimeType.value.startsWith("audio/")) {
    return "audio"
  }

  if (mimeType.value === "text/plain" || ["txt", "md", "csv"].includes(fileExtension.value)) {
    return "text"
  }

  if (
    mimeType.value === "application/pdf" ||
    mimeType.value === "text/html" ||
    mimeType.value === "application/xhtml+xml" ||
    ["pdf", "html", "htm"].includes(fileExtension.value)
  ) {
    return "frame"
  }

  return "unsupported"
})

async function refreshObjectUrl(): Promise<void> {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value)
  }

  objectUrl.value = URL.createObjectURL(props.blob)
  textContent.value = viewerKind.value === "text" ? await props.blob.text() : ""
}

watch(
  () => [props.blob, props.item.id] as const,
  () => {
    void refreshObjectUrl()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value)
  }
})
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <img
      v-if="viewerKind === 'image'"
      :src="objectUrl"
      :alt="item.title"
      class="mx-auto max-h-[70dvh] w-auto max-w-full object-contain"
    />

    <video
      v-else-if="viewerKind === 'video'"
      :src="objectUrl"
      class="max-h-[70dvh] w-full bg-black"
      controls
      playsinline
    />

    <audio v-else-if="viewerKind === 'audio'" :src="objectUrl" class="w-full p-4" controls />

    <pre
      v-else-if="viewerKind === 'text'"
      class="max-h-[70dvh] overflow-auto whitespace-pre-wrap break-words p-4 text-sm text-slate-800"
      >{{ textContent }}</pre
    >

    <iframe
      v-else-if="viewerKind === 'frame'"
      :src="objectUrl"
      :title="item.title"
      class="h-[65dvh] min-h-[420px] w-full bg-white"
      sandbox="allow-same-origin"
      referrerpolicy="no-referrer"
    />

    <div v-else class="space-y-3 p-4">
      <p class="text-sm text-slate-700">
        {{ t("learningPaths.viewerUnsupported") }}
      </p>
      <div class="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          class="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl bg-chamilo-700 px-4 py-3 font-semibold text-white"
          @click="emit('openExternal')"
        >
          <i class="pi pi-external-link" aria-hidden="true" />
          {{ t("learningPaths.openExternal") }}
        </button>
        <button
          type="button"
          class="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-800"
          @click="emit('download')"
        >
          <i class="pi pi-download" aria-hidden="true" />
          {{ t("learningPaths.downloadContent") }}
        </button>
      </div>
    </div>
  </div>
</template>
