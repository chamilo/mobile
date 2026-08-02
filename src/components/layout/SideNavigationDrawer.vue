<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import type { RouteLocationRaw } from "vue-router"

interface NavigationItem {
  key: string
  label: string
  icon: string
  to: RouteLocationRaw
}

const props = defineProps<{
  open: boolean
  courseProgressRoute: RouteLocationRaw | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const closeButton = ref<HTMLButtonElement | null>(null)

const primaryItems = computed<NavigationItem[]>(() => [
  {
    key: "courses",
    label: t("navigation.courses"),
    icon: "pi pi-book",
    to: { name: "courses" },
  },
  {
    key: "progress",
    label: t("navigation.myProgress"),
    icon: "pi pi-chart-line",
    to: { name: "my-progress" },
  },
  {
    key: "messages",
    label: t("navigation.socialMessages"),
    icon: "pi pi-comments",
    to: { name: "messages" },
  },
  {
    key: "profile",
    label: t("navigation.profile"),
    icon: "pi pi-user",
    to: { name: "profile" },
  },
])

watch(
  () => props.open,
  async (open) => {
    if (!open) return

    await nextTick()
    closeButton.value?.focus()
  },
)
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50" @keydown.esc="emit('close')">
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/45"
        :aria-label="t('navigation.closeMenu')"
        @click="emit('close')"
      />

      <aside
        id="app-navigation-drawer"
        class="absolute inset-y-0 left-0 flex w-[min(86vw,22rem)] flex-col bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        :aria-label="t('navigation.menu')"
      >
        <div class="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
              {{ t("app.name") }}
            </p>
            <h2 class="mt-1 text-lg font-semibold text-slate-900">
              {{ t("navigation.menu") }}
            </h2>
          </div>

          <button
            ref="closeButton"
            type="button"
            class="flex min-h-touch min-w-touch items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-chamilo-600"
            :aria-label="t('navigation.closeMenu')"
            @click="emit('close')"
          >
            <i class="pi pi-times" aria-hidden="true" />
          </button>
        </div>

        <nav class="flex-1 overflow-y-auto px-3 py-4" :aria-label="t('navigation.menu')">
          <p class="px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {{ t("navigation.main") }}
          </p>

          <div class="mt-2 space-y-1">
            <RouterLink
              v-for="item in primaryItems"
              :key="item.key"
              :to="item.to"
              class="flex min-h-touch items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-chamilo-600"
              active-class="bg-chamilo-50 text-chamilo-800"
              @click="emit('close')"
            >
              <i :class="item.icon" class="text-lg" aria-hidden="true" />
              <span>{{ item.label }}</span>
            </RouterLink>
          </div>

          <template v-if="courseProgressRoute">
            <p class="mt-6 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {{ t("navigation.currentCourse") }}
            </p>

            <RouterLink
              :to="courseProgressRoute"
              class="mt-2 flex min-h-touch items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-chamilo-600"
              active-class="bg-chamilo-50 text-chamilo-800"
              @click="emit('close')"
            >
              <i class="pi pi-chart-line text-lg" aria-hidden="true" />
              <span>{{ t("navigation.currentCourseProgress") }}</span>
            </RouterLink>
          </template>
        </nav>

        <p class="border-t border-slate-200 px-5 py-4 text-xs leading-5 text-slate-500">
          {{ t("navigation.swipeHint") }}
        </p>
      </aside>
    </div>
  </Teleport>
</template>
