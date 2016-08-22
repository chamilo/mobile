document.addEventListener('deviceready', function () {
    require([
        'backbone',
        'view/login',
        'model/campus',
        'view/home',
        'view/inbox',
        'view/message',
        'view/user-profile'
    ], function (
        Backbone,
        LoginView,
        CampusModel,
        HomeView,
        InboxView,
        MessageView,
        UserProfileView
    ) {
        var campus = null;

        var Router = Backbone.Router.extend({
            routes: {
                '' : 'index',
                'courses': 'courses',
                'messages': 'messages',
                'profile': 'profile',
                'message/:id': 'message'
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
            courses: function () {
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
            }
        });

        new Router();
        Backbone.history.start();
    });
});
