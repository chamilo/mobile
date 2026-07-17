<script setup lang="ts">
import { useI18n } from "vue-i18n"

import FeaturePlaceholder from "@/components/states/FeaturePlaceholder.vue"

const { t } = useI18n()
</script>

<template>
  <FeaturePlaceholder
    icon="pi pi-building"
    :title="t('placeholders.campuses.title')"
    :description="t('placeholders.campuses.description')"
  />
</template>
