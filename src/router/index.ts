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
import AgendaView from "@/views/AgendaView.vue"
import AssignmentsView from "@/views/AssignmentsView.vue"
import AssignmentDetailView from "@/views/AssignmentDetailView.vue"
import ExercisePlayerView from "@/views/ExercisePlayerView.vue"
import ExerciseResultView from "@/views/ExerciseResultView.vue"
import ExercisesView from "@/views/ExercisesView.vue"
import ForumsView from "@/views/ForumsView.vue"
import ForumThreadsView from "@/views/ForumThreadsView.vue"
import ForumThreadView from "@/views/ForumThreadView.vue"
import GradebookView from "@/views/GradebookView.vue"
import LearningPathDetailView from "@/views/LearningPathDetailView.vue"
import LearningPathsView from "@/views/LearningPathsView.vue"
import SurveysView from "@/views/SurveysView.vue"
import SurveyDetailView from "@/views/SurveyDetailView.vue"
import CourseHomeView from "@/views/CourseHomeView.vue"
import CourseOfflineSetupView from "@/views/CourseOfflineSetupView.vue"
import CourseLinksView from "@/views/CourseLinksView.vue"
import DocumentsView from "@/views/DocumentsView.vue"
import CourseProgressView from "@/views/CourseProgressView.vue"
import CoursesView from "@/views/CoursesView.vue"
import LoginView from "@/views/LoginView.vue"
import MessageComposeView from "@/views/MessageComposeView.vue"
import MessageDetailView from "@/views/MessageDetailView.vue"
import MessagesView from "@/views/MessagesView.vue"
import MyProgressView from "@/views/MyProgressView.vue"
import NotebookFormView from "@/views/NotebookFormView.vue"
import NotebookView from "@/views/NotebookView.vue"
import OfflineSyncView from "@/views/OfflineSyncView.vue"
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
    path: "/progress",
    name: "my-progress",
    component: MyProgressView,
    meta: {
      titleKey: "routes.myProgress",
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
    path: "/offline-sync",
    name: "offline-sync",
    component: OfflineSyncView,
    meta: {
      titleKey: "routes.offlineSync",
      showBottomNavigation: false,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/messages",
    name: "messages",
    component: MessagesView,
    meta: {
      titleKey: "routes.messages",
      showBottomNavigation: true,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/messages/compose",
    name: "message-compose",
    component: MessageComposeView,
    props: (route) => ({
      recipientId: typeof route.query.recipientId === "string" ? route.query.recipientId : null,
      recipientName:
        typeof route.query.recipientName === "string" ? route.query.recipientName : null,
      subject: typeof route.query.subject === "string" ? route.query.subject : null,
      parentId: typeof route.query.parentId === "string" ? route.query.parentId : null,
    }),
    meta: {
      titleKey: "routes.messageCompose",
      showBottomNavigation: false,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/messages/:messageId",
    name: "message-detail",
    component: MessageDetailView,
    props: true,
    meta: {
      titleKey: "routes.messageDetail",
      showBottomNavigation: false,
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
    path: "/courses/:courseId/offline",
    name: "course-offline-setup",
    component: CourseOfflineSetupView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.courseOfflineSetup",
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
    path: "/courses/:courseId/documents",
    name: "documents",
    component: DocumentsView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.documents",
      showBottomNavigation: false,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/courses/:courseId/links",
    name: "course-links",
    component: CourseLinksView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.courseLinks",
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
    path: "/courses/:courseId/learning-paths",
    name: "learning-paths",
    component: LearningPathsView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.learningPaths",
      showBottomNavigation: false,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/courses/:courseId/learning-paths/:learningPathId",
    name: "learning-path-detail",
    component: LearningPathDetailView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      learningPathId: String(route.params.learningPathId),
      learningPathTitle:
        typeof route.query.learningPathTitle === "string" ? route.query.learningPathTitle : null,
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.learningPathDetail",
      showBottomNavigation: false,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/courses/:courseId/exercises",
    name: "exercises",
    component: ExercisesView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.exercises",
      showBottomNavigation: false,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/courses/:courseId/exercises/:exerciseId",
    name: "exercise-player",
    component: ExercisePlayerView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      exerciseId: String(route.params.exerciseId),
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.exercisePlayer",
      showBottomNavigation: false,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/courses/:courseId/exercises/:exerciseId/attempts/:attemptId/result",
    name: "exercise-result",
    component: ExerciseResultView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      exerciseId: String(route.params.exerciseId),
      attemptId: String(route.params.attemptId),
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.exerciseResult",
      showBottomNavigation: false,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/courses/:courseId/forums",
    name: "forums",
    component: ForumsView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.forums",
      showBottomNavigation: false,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/courses/:courseId/forums/:forumId",
    name: "forum-threads",
    component: ForumThreadsView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      forumId: String(route.params.forumId),
      forumTitle: typeof route.query.forumTitle === "string" ? route.query.forumTitle : null,
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.forumThreads",
      showBottomNavigation: false,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/courses/:courseId/forums/:forumId/threads/:threadId",
    name: "forum-thread",
    component: ForumThreadView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      forumId: String(route.params.forumId),
      threadId: String(route.params.threadId),
      forumTitle: typeof route.query.forumTitle === "string" ? route.query.forumTitle : null,
      threadTitle: typeof route.query.threadTitle === "string" ? route.query.threadTitle : null,
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.forumThread",
      showBottomNavigation: false,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/courses/:courseId/assignments",
    name: "assignments",
    component: AssignmentsView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.assignments",
      showBottomNavigation: false,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/courses/:courseId/assignments/:assignmentId",
    name: "assignment-detail",
    component: AssignmentDetailView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      assignmentId: String(route.params.assignmentId),
      assignmentTitle:
        typeof route.query.assignmentTitle === "string" ? route.query.assignmentTitle : null,
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.assignmentDetail",
      showBottomNavigation: false,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/courses/:courseId/surveys",
    name: "surveys",
    component: SurveysView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.surveys",
      showBottomNavigation: false,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/courses/:courseId/surveys/:surveyId",
    name: "survey-detail",
    component: SurveyDetailView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      surveyId: String(route.params.surveyId),
      surveyTitle: typeof route.query.surveyTitle === "string" ? route.query.surveyTitle : null,
      mode: typeof route.query.mode === "string" ? route.query.mode : null,
      invitationLpItemId: typeof route.query.lpItemId === "string" ? route.query.lpItemId : null,
      invitationCode:
        typeof route.query.invitationCode === "string" ? route.query.invitationCode : null,
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.surveyDetail",
      showBottomNavigation: false,
      requiresCampus: true,
      requiresAuth: true,
    },
  },
  {
    path: "/courses/:courseId/gradebook",
    name: "gradebook",
    component: GradebookView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.gradebook",
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
    path: "/courses/:courseId/agenda",
    name: "agenda",
    component: AgendaView,
    props: (route) => ({
      courseId: String(route.params.courseId),
      sessionId: typeof route.query.sid === "string" ? route.query.sid : null,
      membershipId: typeof route.query.membership === "string" ? route.query.membership : null,
      sessionCourseId:
        typeof route.query.sessionCourse === "string" ? route.query.sessionCourse : null,
      source: typeof route.query.source === "string" ? route.query.source : null,
    }),
    meta: {
      titleKey: "routes.agenda",
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
