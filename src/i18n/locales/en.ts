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
  connectivity: {
    offline: "You are offline. Saved campus profiles remain available.",
  },
  campus: {
    eyebrow: "First step",
    title: "Connect to a campus",
    description:
      "Save the address of a Chamilo campus. Authentication and server compatibility checks are implemented in later batches.",
    savedTitle: "Saved campuses",
    count: "{count} saved",
    emptyTitle: "No campuses saved",
    emptyDescription: "Add a campus above to continue.",
    selected: "Selected",
    removeConfirmation: "Remove this campus profile from this device?",
    compatibility: {
      unknown: "Compatibility not checked",
      compatible: "Compatible campus",
      incompatible: "Incompatible campus",
    },
    form: {
      addTitle: "Add a campus",
      editTitle: "Edit campus",
      description: "Use the public base address of the Chamilo installation.",
      name: "Campus name",
      url: "Campus URL",
      urlHelp: "HTTPS is required except for explicit local development.",
      allowHttp: "Allow HTTP for local development",
      allowHttpHelp: "Only localhost, private network addresses and .local hosts are accepted.",
    },
    validation: {
      display_name_required: "Enter a campus name.",
      display_name_too_long: "Campus name must contain at most 80 characters.",
      url_required: "Enter the campus URL.",
      url_invalid: "Enter a valid campus URL.",
      url_credentials_not_allowed: "Do not include credentials in the campus URL.",
      url_query_not_allowed: "Remove query parameters from the campus URL.",
      url_hash_not_allowed: "Remove the fragment from the campus URL.",
      protocol_not_allowed: "Only HTTP and HTTPS URLs are supported.",
      http_not_allowed: "Use HTTPS or explicitly allow HTTP for local development.",
      http_host_not_allowed: "HTTP is allowed only for local development hosts.",
    },
    storeErrors: {
      load_failed: "Saved campuses could not be read. Retry before adding new data.",
      save_failed: "Campus changes could not be saved on this device.",
    },
  },
  placeholders: {
    login: {
      title: "Sign in",
      description: "JWT authentication will be implemented after the campus transport layer.",
    },
    courses: {
      title: "Your courses will appear here",
      description: "Course and session data are not connected yet.",
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
    addCampus: "Add campus",
    cancel: "Cancel",
    continue: "Continue",
    edit: "Edit",
    remove: "Remove",
    retry: "Retry",
    saveChanges: "Save changes",
    select: "Select",
    goToCourses: "Go to courses",
  },
}
