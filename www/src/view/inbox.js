define([
    'backbone',
    'text!template/inbox.html',
    'collection/messages',
    'view/inbox-message'
], function (Backbone, inboxTemplate, MessagesCollection, InboxMessageView) {
    var campus = null,
        messages = null;

    var loadMessages = function () {
        if (!window.navigator.onLine) {
            alert('No online');

            return;
        }

        if (!campus) {
            alert('No campus');

            return;
        }

        $.post(campus.get('url') + '/main/webservices/api/v2.php', {
            action: 'user_messages',
            username: campus.get('username'),
            api_key: campus.get('apiKey'),
            last: campus.get('lastMessage')
        })
            .done(function (response) {
                if (response.error) {
                    alert(response.message);

                    return;
                }

                response.data.reverse();

                response.data.forEach(function (messageDetail) {
                    messages.create({
                        messageId: parseInt(messageDetail.id),
                        sender: messageDetail.sender.completeName,
                        title: messageDetail.title,
                        content: messageDetail.content,
                        hasAttachment: messageDetail.hasAttachments,
                        sendDate: messageDetail.sendDate,
                        url: messageDetail.url
                    });
                });

                if (response.data.length) {
                    var lastMessage = _.last(response.data);

                    campus.save({
                        lastMessage: parseInt(lastMessage.id),
                        lastCheckDate: new Date()
                    });
                }
            });
    };

    var InboxView = Backbone.View.extend({
        tagName: 'div',
        attributes: {
            id: 'inbox'
        },
        initialize: function () {
            this.collection = new MessagesCollection();
            this.collection
                .on('add', this.renderMessage, this);

            campus = this.model;
            messages = this.collection;
        },
        template: _.template(inboxTemplate),
        render: function () {
            this.el.innerHTML = this.template();
            this.collection
                .each(this.renderMessage, this);
            this.collection
                .fetch();

            loadMessages();

            return this;
        },
        renderMessage: function (message) {
            var messageView = new InboxMessageView({
                model: message
            });

            this.$el
                .find('#messages-list')
                .prepend(
                    messageView.render().el
                );
        },
        events: {
            'click #btn-back': 'btnBackOnClick'
        },
        btnBackOnClick: function (e) {
            e.preventDefault();

            window.history.back();
        }
    });

    return InboxView;
});