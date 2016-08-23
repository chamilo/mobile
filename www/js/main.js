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
        'view/course-home'
    ], function (
        Backbone,
        LoginView,
        CampusModel,
        HomeView,
        InboxView,
        MessageView,
        UserProfileView,
        CoursesView,
        CourseHomeView
    ) {
        var campus = null;

        var Router = Backbone.Router.extend({
            routes: {
                '' : 'index',
                'messages': 'messages',
                'profile': 'profile',
                'message/:id': 'message',
                'courses': 'courses',
                'course/:id': 'courseHome'
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
                inboxView.render();
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
            }
        });

        new Router();
        Backbone.history.start();
    });
});
