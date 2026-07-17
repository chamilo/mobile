<script setup lang="ts">
import { useI18n } from "vue-i18n"

import FeaturePlaceholder from "@/components/states/FeaturePlaceholder.vue"

const { t } = useI18n()
</script>

<template>
  <FeaturePlaceholder
    icon="pi pi-book"
    :title="t('placeholders.courses.title')"
    :description="t('placeholders.courses.description')"
  />
</template>
