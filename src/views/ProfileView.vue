<script setup lang="ts">
import { useI18n } from "vue-i18n"

import FeaturePlaceholder from "@/components/states/FeaturePlaceholder.vue"

const { t } = useI18n()
</script>

<template>
  <FeaturePlaceholder
    icon="pi pi-user"
    :title="t('placeholders.profile.title')"
    :description="t('placeholders.profile.description')"
  />
</template>
