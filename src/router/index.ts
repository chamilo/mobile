import {
  createMemoryHistory,
  createRouter,
  createWebHistory,
  type RouterHistory,
  type RouteRecordRaw,
} from "vue-router"

import AnnouncementsView from "@/views/AnnouncementsView.vue"
import CampusView from "@/views/CampusView.vue"
import CourseHomeView from "@/views/CourseHomeView.vue"
import CoursesView from "@/views/CoursesView.vue"
import LoginView from "@/views/LoginView.vue"
import NotFoundView from "@/views/NotFoundView.vue"
import ProfileView from "@/views/ProfileView.vue"

export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/courses",
  },
  {
    path: "/campuses",
    name: "campuses",
    component: CampusView,
    meta: {
      titleKey: "routes.campuses",
      showBottomNavigation: false,
    },
  },
  {
    path: "/login",
    name: "login",
    component: LoginView,
    meta: {
      titleKey: "routes.login",
      showBottomNavigation: false,
    },
  },
  {
    path: "/courses",
    name: "courses",
    component: CoursesView,
    meta: {
      titleKey: "routes.courses",
      showBottomNavigation: true,
    },
  },
  {
    path: "/profile",
    name: "profile",
    component: ProfileView,
    meta: {
      titleKey: "routes.profile",
      showBottomNavigation: true,
    },
  },
  {
    path: "/courses/:courseId",
    name: "course-home",
    component: CourseHomeView,
    props: true,
    meta: {
      titleKey: "routes.courseHome",
      showBottomNavigation: false,
    },
  },
  {
    path: "/courses/:courseId/announcements",
    name: "announcements",
    component: AnnouncementsView,
    props: true,
    meta: {
      titleKey: "routes.announcements",
      showBottomNavigation: false,
    },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: NotFoundView,
    meta: {
      titleKey: "routes.notFound",
      showBottomNavigation: false,
    },
  },
]

export function createAppRouter(history: RouterHistory = createWebHistory()) {
  return createRouter({
    history,
    routes,
    scrollBehavior: () => ({ top: 0 }),
  })
}

export function createTestRouter() {
  return createAppRouter(createMemoryHistory())
}

export const router = createAppRouter()
