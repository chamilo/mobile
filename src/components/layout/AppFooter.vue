<script setup lang="ts">
import { App } from "@capacitor/app"
import { Capacitor } from "@capacitor/core"
import { onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"

const props = defineProps<{
  version: string
}>()

const { t } = useI18n()
const displayedVersion = ref(props.version)

onMounted(async () => {
  if (!Capacitor.isNativePlatform()) return

  try {
    const info = await App.getInfo()
    if (info.version) {
      displayedVersion.value = info.version
    }
  } catch {
    // Keep the build-time fallback when native app metadata is unavailable.
  }
})
</script>

<template>
  <footer class="pt-8 text-center text-[10px] leading-4 text-slate-400">
    {{ t("app.version", { version: displayedVersion }) }}
  </footer>
</template>
