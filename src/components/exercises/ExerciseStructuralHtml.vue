<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue"

const props = defineProps<{
  html: string
}>()

const root = ref<HTMLElement | null>(null)

function render(): void {
  if (root.value) root.value.innerHTML = props.html
}

watch([root, () => props.html], render, { immediate: true })

onBeforeUnmount(() => {
  if (root.value) root.value.replaceChildren()
})
</script>

<template>
  <div ref="root" />
</template>
