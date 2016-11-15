define([
    'backbone',
    'view/login',
    'model/campus',
    'view/home',
    'view/inbox',
    'view/message',
    'view/user-profile',
    'view/course-home',
    'view/course-descriptions',
    'view/course-announcements',
    'view/course-announcement',
    'view/course-agenda',
    'view/course-notebooks',
    'view/course-documents',
    'view/course-forumcategories',
    'view/course-forum',
    'view/course-forumthread',
    'view/course-lpcategories',
    'view/logout'
], function (
    Backbone,
    LoginView,
    CampusModel,
    HomeView,
    InboxView,
    MessageView,
    UserProfileView,
    CourseHomeView,
    CourseDescriptionsView,
    CourseAnnouncementsView,
    CourseAnnouncementView,
    CourseAgendaView,
    CourseNotebooksView,
    CourseDocumentsView,
    CourseForumCategoriesView,
    CourseForumView,
    CourseForumThreadView,
    CourseLpCategoriesView,
    LogoutView
) {
    var campus = null,
        pushNotification;

    var Router = Backbone.Router.extend({
        routes: {
            '': 'index',
            'messages': 'messages',
            'profile': 'profile',
            'message/:id': 'message',
            'course/:id': 'courseHome',
            'description/:id': 'courseDescription',
            'announcements/:id': 'courseAnnouncements',
            'announcement/:course/:id': 'courseAnnouncement',
            'agenda/:id': 'courseAgenda',
            'notebook/:id': 'courseNotebooks',
            'documents/:id/:dir_id': 'courseDocuments',
            'forumcategories/:id': 'courseForumCategories',
            'forum/:id': 'courseForum',
            'forumthread/:forum/:id': 'courseForumThread',
            'lpcategories/:id': 'courseLpCategories',
            'logout': 'logout'
        },
        index: function () {
            window.sessionStorage.removeItem('courseId');

            campus = new CampusModel();
            campus.fetch()
                .done(function () {
                    $.ajaxSetup({
                        url: campus.get('url') + '/main/webservices/api/v2.php',
                        data: {
                            api_key: campus.get('apiKey'),
                            username: campus.get('username')
                        },
                        dataType: 'json'
                    });

                    var homeView = new HomeView();
                    homeView.render();

                    var gcmSenderId = campus.get('gcmSenderId');

                    if (!gcmSenderId) {
                        return;
                    }

                    pushNotification = window.PushNotification.init({
                        android: {
                            senderID: gcmSenderId
                        },
                        ios: {
                            alert: 'true',
                            badge: 'true',
                            sound: 'true'
                        },
                        windows: {}
                    });
                    pushNotification.on('error', function (e) {
                        console.log(e);
                    });
                    pushNotification.on('registration', function (data) {
                        $.ajax({
                            type: 'post',
                            data: {
                                action: 'gcm_id',
                                registration_id: data.registrationId
                            }
                        });
                    });
                    pushNotification.on('notification', function (data) {
                        console.log(data);
                    });
                })
                .fail(function () {
                    var loginView = new LoginView();
                    loginView.render();
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
        courseHome: function (courseId) {
            window.sessionStorage.setItem('courseId', courseId);

            var courseHome = new CourseHomeView();

            $('body')
                .html(
                    courseHome.render().$el
                );
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
        courseForumThread: function (forum, thread) {
            var forumThreadView = new CourseForumThreadView({
                campus: campus.toJSON(),
                forumId: forum,
                threadId: thread
            });

            $('body').html(
                forumThreadView.render().el
                );
        },
        courseLpCategories: function (courseId) {
            var lpCategoriesView = new CourseLpCategoriesView({
                campus: campus.toJSON(),
                courseId: courseId
            });

            $('body').html(
                lpCategoriesView.render().el
                );
        },
        logout: function () {
            var view = new LogoutView();

            view.render();

            $('body').html(view.el);

            view.onClear(function () {
                if (!pushNotification) {
                    return;
                }

                pushNotification.unregister(function () {
                    console.log('unregister success');
                }, function () {
                    console.log('unregister error');
                });
            });
        }
    });

    return {
        init: function () {
            new Router();

            Backbone.history.start();
        }
    };
});
