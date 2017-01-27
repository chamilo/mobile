define({
    appName: "Chamilo LMS Mobile",
    myChamilo: "My Chamilo LMS",
    myCourses: 'My courses',
    domain: "Domain",
    myAccount: "My account",
    username: "Username",
    password: "Password",
    signIn: "Sign in",
    messages: "Messages",
    profile: "Profile",
    signOut: "Sign out",
    goToCourse: "Go to course",
    courseAgenda: "Course agenda",
    announcement: "Announcement",
    courseAnnouncements: "Course announcements",
    courseDescriptions: "Course descriptions",
    courseDocuments: "Course documents",
    allDay: "All day",
    forum: "Forum",
    views: "Views",
    replies: "Replies",
    forumCategories: "Forum categories",
    numberOfThreads: "Number of threads",
    lastPost: "Last post",
    reply: "Reply",
    quote: "Quote",
    replyTo: function (title) {
        return "Reply to <cite>" + title + "</cite>";
    },
    title: "Title",
    text: "Text",
    notifyMeByEmail: "Notify me by email",
    replyThisPost: "Reply this post",
    thread: "Thread",
    replyThisThread: "Reply this thread",
    description: "Description",
    documents: "Documents",
    learningPaths: "Learning paths",
    agenda: "Agenda",
    notebook: "Notebook",
    announcements: "Announcements",
    learningPathsCategories: "Learning paths categories",
    creationDate: function (date) {
        return "Creation date: " + date;
    },
    updateDate: function (date) {
        return "Update date: " + date;
    },
    courseNotebook: "Course notebooks",
    inbox: "Inbox",
    myProfile: "My profile",
    phoneNumber: "Phone number",
    signingOut: "Signing out",
    loading: "Loading",
    noContentAvailable: "No content available",
    sessions: 'Sessions',
    fromDateUntilDate: function (from, until) {
        if (from && !until) {
            return "From " + from;
        }

        if (!from && until) {
            return "Until " + until;
        }

        return "From " + from + " until " + until;
    },
    downloadCompleted: "Download completed",
    downloadFailed: "Download failed"
});
