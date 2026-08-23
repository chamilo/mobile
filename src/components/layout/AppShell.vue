<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute } from "vue-router"

import AppFooter from "@/components/layout/AppFooter.vue"
import AppHeader from "@/components/layout/AppHeader.vue"
import BottomNavigation from "@/components/layout/BottomNavigation.vue"
import SideNavigationDrawer from "@/components/layout/SideNavigationDrawer.vue"
import OfflineBanner from "@/components/states/OfflineBanner.vue"
import {
  buildCourseProgressRoute,
  CourseRouteContextError,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"
import { useAuthStore } from "@/stores/auth"
import { useBrandingStore } from "@/stores/branding"
import { useCampusStore } from "@/stores/campus"
import { useCoursesStore } from "@/stores/courses"

const EDGE_SWIPE_WIDTH_PX = 28
const OPEN_SWIPE_DISTANCE_PX = 72

const route = useRoute()
const { t } = useI18n()
const authStore = useAuthStore()
const campusStore = useCampusStore()
const brandingStore = useBrandingStore()
const coursesStore = useCoursesStore()
const appVersion = import.meta.env.VITE_APP_VERSION ?? "development"
const drawerOpen = ref(false)
const touchStartX = ref<number | null>(null)
const touchStartY = ref<number | null>(null)

const currentCourseTitle = computed(() => {
  const courseId = Number(route.params.courseId)

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return null
  }

  const directCourse = coursesStore.overview.directCourses.find(
    (enrollment) => enrollment.course.id === courseId,
  )

  if (directCourse) {
    return directCourse.course.title
  }

  const sessions = [
    ...coursesStore.overview.currentSessions,
    ...coursesStore.overview.upcomingSessions,
    ...coursesStore.overview.pastSessions,
  ]

  for (const session of sessions) {
    const enrollment = session.courses.find((candidate) => candidate.course.id === courseId)
    if (enrollment) {
      return enrollment.course.title
    }
  }

  return null
})

const pageTitle = computed(() => {
  if (currentCourseTitle.value) {
    return currentCourseTitle.value
  }

  const titleKey = route.meta.titleKey

  return typeof titleKey === "string" ? t(titleKey) : t("app.name")
})
const showBottomNavigation = computed(() => route.meta.showBottomNavigation)
const showNavigationDrawer = computed(() => route.meta.requiresAuth === true)
const siteName = computed(
  () => brandingStore.branding?.siteName ?? campusStore.selectedCampus?.displayName ?? "Chamilo",
)
const brandName = computed(() => {
  if (route.name === "campuses") {
    return t("app.name")
  }

  return campusStore.selectedCampus ? siteName.value : t("app.name")
})
const logoUrl = computed(() => brandingStore.branding?.logoUrl ?? null)
const logoAlt = computed(() => t("app.platformLogoAlt", { siteName: siteName.value }))

const courseProgressRoute = computed(() => {
  const courseId = typeof route.params.courseId === "string" ? route.params.courseId : null
  if (!courseId) return null

  try {
    const context = parseCourseRouteContext({
      courseId,
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    })

    return buildCourseProgressRoute(context)
  } catch (error) {
    if (error instanceof CourseRouteContextError) return null
    throw error
  }
})

function openDrawer(): void {
  if (!showNavigationDrawer.value) return
  drawerOpen.value = true
}

function closeDrawer(): void {
  drawerOpen.value = false
}

function handleTouchStart(event: TouchEvent): void {
  if (drawerOpen.value || !showNavigationDrawer.value || event.touches.length !== 1) {
    touchStartX.value = null
    touchStartY.value = null
    return
  }

  const touch = event.touches[0]
  if (!touch || touch.clientX > EDGE_SWIPE_WIDTH_PX) {
    touchStartX.value = null
    touchStartY.value = null
    return
  }

  touchStartX.value = touch.clientX
  touchStartY.value = touch.clientY
}

function handleTouchEnd(event: TouchEvent): void {
  if (touchStartX.value === null || touchStartY.value === null) return

  const touch = event.changedTouches[0]
  if (!touch) return

  const horizontalDistance = touch.clientX - touchStartX.value
  const verticalDistance = Math.abs(touch.clientY - touchStartY.value)

  touchStartX.value = null
  touchStartY.value = null

  if (horizontalDistance >= OPEN_SWIPE_DISTANCE_PX && horizontalDistance > verticalDistance * 1.5) {
    openDrawer()
  }
}

watch(
  [() => route.params.courseId, () => authStore.isAuthenticated],
  ([courseId, authenticated]) => {
    if (typeof courseId === "string" && authenticated && coursesStore.status === "idle") {
      void coursesStore.loadOverview()
    }
  },
  { immediate: true },
)

watch(
  () => campusStore.selectedCampus,
  (campus) => {
    if (campus) {
      void brandingStore.load(campus)
      return
    }

    brandingStore.reset()
  },
  { immediate: true },
)

watch(
  () => route.fullPath,
  () => closeDrawer(),
)

watch(drawerOpen, (open) => {
  document.body.style.overflow = open ? "hidden" : ""
})

onBeforeUnmount(() => {
  document.body.style.overflow = ""
})
</script>

<template>
  <div
    class="min-h-dvh bg-slate-100"
    @touchstart.passive="handleTouchStart"
    @touchend.passive="handleTouchEnd"
  >
    <AppHeader
      :brand-name="brandName"
      :title="pageTitle"
      :logo-url="logoUrl"
      :logo-alt="logoAlt"
      :show-menu-button="showNavigationDrawer"
      :menu-label="t('navigation.openMenu')"
      @menu="openDrawer"
    />
    <OfflineBanner />

    <main
      id="main-content"
      class="mx-auto w-full max-w-screen-sm px-4 py-6"
      :class="showBottomNavigation ? 'pb-24' : 'pb-8'"
    >
      <RouterView />
      <AppFooter :version="appVersion" />
    </main>

    <BottomNavigation v-if="showBottomNavigation" />

    <SideNavigationDrawer
      :open="drawerOpen"
      :course-progress-route="courseProgressRoute"
      @close="closeDrawer"
    />
  </div>
</template>
