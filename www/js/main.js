document.addEventListener('deviceready', function () {
    require([
        'backbone',
        'view/login',
        'model/campus',
        'view/home',
        'view/inbox',
        'view/message',
        'view/user-profile',
        'view/courses',
        'view/course-home',
        'view/course-descriptions',
        'view/course-announcements',
        'view/course-announcement',
        'view/course-agenda',
        'view/course-notebooks',
        'view/course-documents',
        'view/course-forumcategories',
        'view/course-forum',
        'view/course-forumthread'
    ], function (
        Backbone,
        LoginView,
        CampusModel,
        HomeView,
        InboxView,
        MessageView,
        UserProfileView,
        CoursesView,
        CourseHomeView,
        CourseDescriptionsView,
        CourseAnnouncementsView,
        CourseAnnouncementView,
        CourseAgendaView,
        CourseNotebooksView,
        CourseDocumentsView,
        CourseForumCategoriesView,
        CourseForumView,
        CourseForumThreadView
    ) {
        var campus = null;

        var Router = Backbone.Router.extend({
            routes: {
                '' : 'index',
                'messages': 'messages',
                'profile': 'profile',
                'message/:id': 'message',
                'courses': 'courses',
                'course/:id': 'courseHome',
                'description/:id': 'courseDescription',
                'announcements/:id': 'courseAnnouncements',
                'announcement/:course/:id': 'courseAnnouncement',
                'agenda/:id': 'courseAgenda',
                'notebook/:id': 'courseNotebooks',
                'documents/:id/:dir_id': 'courseDocuments',
                'forumcategories/:id': 'courseForumCategories',
                'forum/:id': 'courseForum',
                'forumthread/:id': 'courseForumThread'
            },
            index: function () {
                campus = new CampusModel();
                campus.fetch({
                    success: function () {
                        var homeView = new HomeView();
                        homeView.render();
                    },
                    error: function () {
                        var loginView = new LoginView();
                        loginView.render();
                    }
                });
            },
            messages: function () {
                var inboxView = new InboxView({
                    model: campus
                });

                $('body').html(
                    inboxView.render().el
                );
            },
            message: function (messageId) {
                if (!messageId) {
                    alert('No message');

                    return;
                }

                var messageView = new MessageView({
                    messageId: parseInt(messageId)
                });
                messageView.render();
            },
            profile: function () {
                new UserProfileView({
                    campus: campus.toJSON()
                });
            },
            courses: function () {
                new CoursesView({
                    campus: campus.toJSON()
                });
            },
            courseHome: function (courseId) {
                new CourseHomeView({
                    campus: campus.toJSON(),
                    courseId: courseId
                });
            },
            courseDescription: function (courseId) {
                new CourseDescriptionsView({
                    campus: campus.toJSON(),
                    courseId: courseId
                });
            },
            courseAnnouncements: function (courseId) {
                var courseAnnouncementsView = new CourseAnnouncementsView({
                    campus: campus.toJSON(),
                    courseId: courseId
                });

                $('body').html(
                    courseAnnouncementsView.render().el
                    );
            },
            courseAnnouncement: function (courseId, announcementId) {
                var courseAnnouncementView = new CourseAnnouncementView({
                    campus: campus.toJSON(),
                    courseId: courseId,
                    announcementId: announcementId
                });

                $('body').html(
                    courseAnnouncementView.render().el
                );
            },
            courseAgenda: function (courseId) {
                var courseAgendaView = new CourseAgendaView({
                    campus: campus.toJSON(),
                    courseId: courseId
                });

                $('body').html(
                    courseAgendaView.render().el
                );
            },
            courseNotebooks: function (courseId) {
                var courseNotebooksView = new CourseNotebooksView({
                    campus: campus.toJSON(),
                    courseId: courseId
                });

                $('body').html(
                    courseNotebooksView.render().el
                );
            },
            courseDocuments: function (courseId, directoryId) {
                var courseDocumentsView = new CourseDocumentsView({
                    campus: campus.toJSON(),
                    courseId: courseId,
                    directoryId: directoryId
                });
                
                $('body').html(
                    courseDocumentsView.render().el
                );
            },
            courseForumCategories: function (courseId) {
                var forumCategoriesView = new CourseForumCategoriesView({
                    campus: campus.toJSON(),
                    courseId: courseId
                });
                
                $('body').html(
                    forumCategoriesView.render().el
                );
            },
            courseForum: function (forumId) {
                var forumView = new CourseForumView({
                    campus: campus.toJSON(),
                    forumId: forumId
                });

                $('body').html(
                    forumView.render().el
                );
            },
            courseForumThread: function (threadId) {
                var forumThreadView = new CourseForumThreadView({
                    campus: campus.toJSON(),
                    threadId: threadId
                });

                $('body').html(
                    forumThreadView.render().el
                );
            }
        });

        new Router();
        Backbone.history.start();
    });
});
