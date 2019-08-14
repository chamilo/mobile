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
            'course/:course/:session': 'courseHome',
            'description': 'courseDescription',
            'announcements': 'courseAnnouncements',
            'announcement/:id': 'courseAnnouncement',
            'agenda': 'courseAgenda',
            'notebook': 'courseNotebooks',
            'documents/:dir_id': 'courseDocuments',
            'forumcategories': 'courseForumCategories',
            'forum/:id': 'courseForum',
            'forumthread/:forum/:id': 'courseForumThread',
            'lpcategories': 'courseLpCategories',
            'logout': 'logout'
        },
        index: function () {
            window.sessionStorage.clear();

            var indexView = null;

            campus = new CampusModel();
            campus.fetch()
                .done(function () {
                    $.ajaxSetup({
                        url: campus.get('url') + '/main/webservices/api/v2.php',
                        data: {
                            api_key: campus.get('apiKey'),
                            username: campus.get('username')
                        },
                        dataType: 'json',
                        crossDomain: true
                    });

                    indexView = new HomeView();

                    var gcmSenderId = campus.get('gcmSenderId');

                    if (!gcmSenderId) {
                        return;
                    }

                    cordova.plugins.firebase.messaging.requestPermission().then(function () {
                        getToken();
                    });

                    function getToken() {
                        cordova.plugins.firebase.messaging.getToken().then(function (token) {
                            $.ajax({
                                type: 'post',
                                data: {
                                    action: 'gcm_id',
                                    registration_id: token
                                }
                            });
                        });
                    }
                })
                .fail(function () {
                    indexView = new LoginView();
                })
                .always(function () {
                    if (!indexView) {
                        return;
                    }

                    $('body').html(indexView.render().$el);
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

            $('body').html(messageView.render().$el);
        },
        profile: function () {
            var userProfileView = new UserProfileView({
                campus: campus.toJSON()
            });

            $('body').html(userProfileView.render().$el);
        },
        courseHome: function (courseId, sessionId) {
            $.ajaxSetup({
                data: {
                    course: courseId,
                    session: sessionId
                }
            });

            var courseHome = new CourseHomeView();

            $('body').html(courseHome.render().$el);
        },
        courseDescription: function () {
            var courseDescriptionView = new CourseDescriptionsView();

            $('body').html(courseDescriptionView.render().el);
        },
        courseAnnouncements: function () {
            var courseAnnouncementsView = new CourseAnnouncementsView();

            $('body').html(courseAnnouncementsView.render().el);
        },
        courseAnnouncement: function (announcementId) {
            window.sessionStorage.announcementId = announcementId;

            var courseAnnouncementView = new CourseAnnouncementView();

            $('body').html(courseAnnouncementView.render().el);
        },
        courseAgenda: function () {
            var courseAgendaView = new CourseAgendaView();

            $('body').html(courseAgendaView.render().el);
        },
        courseNotebooks: function () {
            var courseNotebooksView = new CourseNotebooksView();

            $('body').html(courseNotebooksView.render().el);
        },
        courseDocuments: function (directoryId) {
            window.sessionStorage.directoryId = directoryId;

            var courseDocumentsView = new CourseDocumentsView();

            $('body').html(courseDocumentsView.render().el);
        },
        courseForumCategories: function () {
            var forumCategoriesView = new CourseForumCategoriesView();

            $('body').html(forumCategoriesView.render().el);
        },
        courseForum: function (forumId) {
            window.sessionStorage.forumId = forumId;

            var forumView = new CourseForumView();

            $('body').html(forumView.render().el);
        },
        courseForumThread: function (forum, thread) {
            window.sessionStorage.forumId = forum;
            window.sessionStorage.threadId = thread;

            var forumThreadView = new CourseForumThreadView();

            $('body').html(forumThreadView.render().$el);
        },
        courseLpCategories: function () {
            var lpCategoriesView = new CourseLpCategoriesView();

            $('body').html(lpCategoriesView.render().el);
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
