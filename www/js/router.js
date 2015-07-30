define([
    'jquery',
    'backbone',
    'models/campus',
    'models/message',
    'views/login',
    'views/inbox',
    'views/message',
    'views/logout',
    'views/alert'
], function (
    $,
    Backbone,
    CampusModel,
    MessageModel,
    LoginView,
    InboxView,
    MessageView,
    LogoutView,
    AlertView
) {
    var Router = Backbone.Router.extend({
        routes: {
            '': 'showIndex',
            'message/:id': 'showMessage',
            'logout': 'showLogout'
        }
    });

    var campusModel = new CampusModel();

    var showIndex = function () {
        var getCampusData = campusModel.getData();

        $.when(getCampusData).done(function () {
            var inboxView = new InboxView({
                model: campusModel
            });

            inboxView.render();
        });

        $.when(getCampusData).fail(function () {
            var loginView = new LoginView();

            document.body.innerHTML = '';
            document.body.appendChild(loginView.render().el);
        });
    };

    var showMessage = function (messageId) {
        messageId = parseInt(messageId);

        if (!messageId) {
            new AlertView({
                model: {
                    message: window.lang.unspecifiedMessage
                }
            });

            return;
        }

        var getCampusData = campusModel.getData();

        $.when(getCampusData).done(function () {
            var messageModel = new MessageModel();
            var getMessageData = messageModel.getData(messageId);

            $.when(getMessageData).done(function () {
                var messageView = new MessageView({
                    model: messageModel
                });

                messageView.render();
            });

            $.when(getMessageData).fail(function () {
                new AlertView({
                    model: {
                        message: window.lang.messageDoesNotExists
                    }
                });
            });
        });

        $.when(getCampusData).fail(function () {
            new AlertView({
                model: {
                    message: window.lang.youHaveNotLogged
                }
            });
        });
    };

    var showLogout = function () {
        var logoutView = new LogoutView();

        document.body.innerHTML = '';
        document.body.appendChild(logoutView.render().el);

        var messageModel = new MessageModel();

        var deleteCampus = campusModel.delete();
        var deleteMessages = messageModel.delete();

        $.when.apply($, [
            deleteCampus,
            deleteMessages
        ]).then(function () {
            Backbone.history.navigate('', true);
        });
    };

    return {
        initialize: function () {
            var router = new Router;
            router.on('route:showIndex', showIndex);
            router.on('route:showMessage', showMessage);
            router.on('route:showLogout', showLogout);

            Backbone.history.start();
        }
    };
});
