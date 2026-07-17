<script setup lang="ts">
import { useI18n } from "vue-i18n"

import FeaturePlaceholder from "@/components/states/FeaturePlaceholder.vue"

defineProps<{
  courseId: string
}>()

const { t } = useI18n()
</script>

<template>
  <FeaturePlaceholder
    icon="pi pi-graduation-cap"
    :title="t('placeholders.courseHome.title')"
    :description="t('placeholders.courseHome.description')"
  />
</template>
