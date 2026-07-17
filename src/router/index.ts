import {
  createMemoryHistory,
  createRouter,
  createWebHistory,
  type RouterHistory,
  type RouteRecordRaw,
} from "vue-router"

import AnnouncementDetailView from "@/views/AnnouncementDetailView.vue"
import AnnouncementsView from "@/views/AnnouncementsView.vue"
import CampusView from "@/views/CampusView.vue"
import CourseDescriptionView from "@/views/CourseDescriptionView.vue"
import CourseHomeView from "@/views/CourseHomeView.vue"
import CourseProgressView from "@/views/CourseProgressView.vue"
import CoursesView from "@/views/CoursesView.vue"
import LoginView from "@/views/LoginView.vue"
import NotebookFormView from "@/views/NotebookFormView.vue"
import NotebookView from "@/views/NotebookView.vue"
import NotFoundView from "@/views/NotFoundView.vue"
import ProfileView from "@/views/ProfileView.vue"

export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/campuses",
  },
  {
    path: "/campuses",
    name: "campuses",
    component: CampusView,
    meta: {
      titleKey: "routes.campuses",
      showBottomNavigation: false,
      requiresCampus: false,
      requiresAuth: false,
    },
  },
  {
    path: "/login",
    name: "login",
    component: LoginView,
    meta: {
      titleKey: "routes.login",
      showBottomNavigation: false,
      requiresCampus: true,
      requiresAuth: false,
      guestOnly: true,
    },
  },
  {
    path: "/courses",
    name: "courses",
    component: CoursesView,
    meta: {
      titleKey: "routes.courses",
      showBottomNavigation: true,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/profile",
    name: "profile",
    component: ProfileView,
    meta: {
      titleKey: "routes.profile",
      showBottomNavigation: true,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/courses/:courseId",
    name: "course-home",
    component: CourseHomeView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.courseHome",
      showBottomNavigation: false,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/courses/:courseId/course-description",
    name: "course-description",
    component: CourseDescriptionView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.courseDescription",
      showBottomNavigation: false,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/courses/:courseId/course-progress",
    name: "course-progress",
    component: CourseProgressView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.courseProgress",
      showBottomNavigation: false,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/courses/:courseId/notebook",
    name: "notebook",
    component: NotebookView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.notebook",
      showBottomNavigation: false,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/courses/:courseId/notebook/edit/:notebookId?",
    name: "notebook-form",
    component: NotebookFormView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      notebookId: typeof route.params.notebookId === "string" ? route.params.notebookId : null,
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.notebookForm",
      showBottomNavigation: false,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/courses/:courseId/announcements",
    name: "announcements",
    component: AnnouncementsView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.announcements",
      showBottomNavigation: false,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/courses/:courseId/announcements/:announcementId",
    name: "announcement-detail",
    component: AnnouncementDetailView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      announcementId: String(route.params.announcementId),
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.announcementDetail",
      showBottomNavigation: false,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: NotFoundView,
    meta: {
      titleKey: "routes.notFound",
      showBottomNavigation: false,
      requiresCampus: false,
      requiresAuth: false,
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
