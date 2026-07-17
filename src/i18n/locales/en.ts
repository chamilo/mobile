export default {
  app: {
    name: "Chamilo Mobile",
    scaffoldStatus: "Mobile foundation ready",
  },
  navigation: {
    courses: "Courses",
    profile: "Profile",
  },
  routes: {
    campuses: "Campuses",
    login: "Sign in",
    courses: "My courses",
    profile: "Profile",
    courseHome: "Course",
    announcements: "Announcements",
    notFound: "Page not found",
  },
  placeholders: {
    campuses: {
      title: "Choose your campus",
      description: "Campus profiles will be implemented in the next batch.",
    },
    login: {
      title: "Sign in",
      description: "JWT authentication will be implemented after the campus transport layer.",
    },
    courses: {
      title: "Your courses will appear here",
      description: "The scaffold is ready. Course and session data are not connected yet.",
    },
    profile: {
      title: "Your profile will appear here",
      description: "The authenticated user contract is tracked as a backend API gap.",
    },
    courseHome: {
      title: "Course home",
      description: "Course capabilities will be added only after their API contracts are verified.",
    },
    announcements: {
      title: "Announcements",
      description: "Read-only announcements will be implemented in a dedicated batch.",
    },
    notFound: {
      title: "Page not found",
      description: "The requested mobile route does not exist.",
    },
  },
  actions: {
    goToCourses: "Go to courses",
  },
}
