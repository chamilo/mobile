define([
    'underscore',
    'backbone',
    'collections/messages',
    'views/inbox-message',
    'text!template/inbox.html',
    'views/alert'
], function (
    _,
    Backbone,
    MessagesCollection,
    InboxMessageView,
    InboxTemplate,
    AlertView
) {
    var campusModel = null;
    var messagesCollection = new MessagesCollection();

    var loadMessages = function () {
        if (!window.navigator.onLine) {
            new AlertView({
                model: {
                    message: window.lang.notOnLine
                }
            });
            return;
        }

        $.post(
            campusModel.get('url') + '/main/webservices/rest.php',
            {
                action: 'getNewMessages',
                username: campusModel.get('username'),
                api_key: campusModel.get('apiKey'),
                last: campusModel.get('lastMessage')
            }
        ).done(loadMessagesDone);
    };

    function loadMessagesDone(response) {
        if (!response.status) {
            return;
        }

        if (!response.messages.length) {
            new AlertView({
                model: {
                    message: window.lang.noNewMessages
                }
            });
            return;
        }

        response.messages.reverse();
        response.messages.forEach(function (messageData) {
            messagesCollection.create({
                messageId: parseInt(messageData.id),
                sender: messageData.sender.completeName,
                title: messageData.title,
                content: messageData.content,
                hasAttachment: messageData.hasAttachments,
                sendDate: messageData.sendDate,
                url: messageData.platform.messagingTool
            });
        });

        var lastMessage = _.last(response.messages);

        campusModel.save({
            lastMessage: parseInt(lastMessage.id),
            lastCheckDate: new Date()
        });
    }

    var InboxView = Backbone.View.extend({
        el: 'body',
        template: _.template(InboxTemplate),
        initialize: function () {
            campusModel = this.model;

            messagesCollection.on('add', this.renderMessage, this);
            messagesCollection.fetch();
        },
        render: function () {
            this.el.innerHTML = this.template();

            messagesCollection.each(this.renderMessage, this);

            return this;
        },
        renderMessage: function (messageModel) {
            var inboxMessageView = new InboxMessageView({
                model: messageModel
            });

            this.$el.find('#messages-list').prepend(inboxMessageView.render().el);
        },
        updateList: function () {
            loadMessages();
        }
    });

    return InboxView;
});
