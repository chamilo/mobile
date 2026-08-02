<script setup lang="ts">
import { useI18n } from "vue-i18n"

const { t } = useI18n()

const items = [
  {
    name: "courses",
    labelKey: "navigation.courses",
    icon: "pi pi-book",
  },
  {
    name: "messages",
    labelKey: "navigation.messages",
    icon: "pi pi-envelope",
  },
  {
    name: "profile",
    labelKey: "navigation.profile",
    icon: "pi pi-user",
  },
] as const
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
    :aria-label="t('app.name')"
  >
    <div class="mx-auto grid max-w-screen-sm grid-cols-3">
      <RouterLink
        v-for="item in items"
        :key="item.name"
        :to="{ name: item.name }"
        class="flex min-h-16 min-w-touch flex-col items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-chamilo-700"
        active-class="bg-chamilo-50 text-chamilo-700"
      >
        <i :class="item.icon" aria-hidden="true" />
        <span>{{ t(item.labelKey) }}</span>
      </RouterLink>
    </div>
  </nav>
</template>
