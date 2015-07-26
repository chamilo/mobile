define([
    'underscore',
    'backbone',
    'collections/messages',
    'views/inbox-message',
    'text!template/inbox.html'
], function (_, Backbone, MessagesCollection, InboxMessageView, InboxTemplate) {
    var campusModel = null;
    var messagesCollection = new MessagesCollection();

    var loadMessages = function () {
        if (!window.navigator.onLine) {
            return;
        }

        var url = campusModel.get('url') + '/main/webservices/rest.php';
        var getMessages = $.post(url, {
            action: 'getNewMessages',
            username: campusModel.get('username'),
            api_key: campusModel.get('apiKey'),
            last: campusModel.get('lastMessage')
        });

        $.when(getMessages).done(function (response) {
            if (!response.status) {
                return;
            }

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

            if (response.messages.length === 0) {
                return;
            }

            var lastMessage = _.first(response.messages);

            campusModel.save({
                lastMessage: parseInt(lastMessage.id),
                lastCheckDate: new Date()
            });
        });
    };

    var InboxView = Backbone.View.extend({
        el: 'body',
        template: _.template(InboxTemplate),
        initialize: function () {
            campusModel = this.model;

            var fetchMessages = messagesCollection.fetch();

            $.when(fetchMessages).done(loadMessages);

            messagesCollection.on('add', this.renderMessage, this);
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

            this.$el.find('#messages-list').append(inboxMessageView.render().el);
        },
        events: {
            'click #messages-update': 'messagesUpdateOnClick'
        },
        messagesUpdateOnClick: function (e) {
            e.preventDefault();

            loadMessages();
        }
    });

    return InboxView;
});
