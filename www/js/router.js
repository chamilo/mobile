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
    var campusModel,
        push;

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
            if (!push) {
                return;
            }

            push.unregister(function () {
                console.log('unregister success');
            }, function () {
                console.log('unregister error');
            });

            window.location.href = '';
        });
    };

    return {
        initialize: function () {
            campusModel = new CampusModel();
            campusModel
                .getData()
                .then(
                    getCampusDataDone,
                    getCampusDataFail
                );

            var inboxView;

            function getCampusDataDone() {
                push = PushNotification.init({
                    android: {
                        senderID: campusModel.get('gcmSenderId')
                    },
                    ios: {
                        alert: 'true',
                        badge: 'true',
                        sound: 'true'
                    },
                    windows: {}
                });
                push.on('error', pushError);
                push.on('registration', pushRegistration);
                push.on('notification', pushNotification);
            }

            function getCampusDataFail() {
                var loginView = new LoginView();

                document.body.innerHTML = '';
                document.body.appendChild(loginView.render().el);
            }

            function pushError(e) {
                console.log('error' + e.message);
            }

            function pushRegistration(data) {
                $.post(
                    campusModel.get('url') + '/main/webservices/rest.php',
                    {
                        action: 'setGcmRegistrationId',
                        username: campusModel.get('username'),
                        api_key: campusModel.get('apiKey'),
                        registration_id: data.registrationId
                    }
                );

                inboxView = new InboxView({
                    model: campusModel
                });
                inboxView.render();
            }

            function pushNotification(data) {
                inboxView.updateList();
            }

            var Router = Backbone.Router.extend({
                routes: {
                    'message/:id': 'showMessage',
                    'logout': 'showLogout'
                }
            });

            var router = new Router;
            router.on('route:showMessage', showMessage);
            router.on('route:showLogout', showLogout);

            Backbone.history.start();
        }
    };
});
