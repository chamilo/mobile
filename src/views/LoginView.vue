<script setup lang="ts">
import { useI18n } from "vue-i18n"

import FeaturePlaceholder from "@/components/states/FeaturePlaceholder.vue"

const { t } = useI18n()
</script>

<template>
  <FeaturePlaceholder
    icon="pi pi-sign-in"
    :title="t('placeholders.login.title')"
    :description="t('placeholders.login.description')"
  />
</template>
