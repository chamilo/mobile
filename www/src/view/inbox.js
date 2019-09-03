define([
    'backbone',
    'text!template/inbox.html',
    'collection/messages',
    'view/inbox-message',
    'view/spinner'
], function (Backbone, inboxTemplate, MessagesCollection, InboxMessageView, SpinnerView) {
    var campus = null,
        messages = null,
        messagesContainer = null;

    var loadMessages = function () {
        if (!campus) {
            alert('No campus');

            return;
        }

        return $.ajax({
            type: 'post',
            data: {
                action: 'user_messages',
                last: campus.get('lastMessage')
            },
            success: function (response) {
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
            }
        });
    };

    function renderInMessageList(message) {
        if (!messagesContainer) {
            return;
        }

        var messageView = new InboxMessageView({ model: message });

        messagesContainer.prepend(
            messageView.render().el
        );
    }

    var InboxView = Backbone.View.extend({
        tagName: 'div',
        className: 'page-inside',
        id: 'inbox',
        initialize: function () {
            this.collection = new MessagesCollection();

            campus = this.model;
            messages = this.collection;
        },
        spinner: new SpinnerView(),
        container: null,
        template: _.template(inboxTemplate),
        render: function () {
            var self = this;

            this.el.innerHTML = this.template();

            messagesContainer = this.$el.find('#lst-messages');

            this.container = this.$el.find('#container');
            this.container.prepend(this.spinner.render().$el);

            this.collection.fetch()
                .done(function () {
                    messages.each(renderInMessageList);
                    messages.on('add', renderInMessageList);

                    loadMessages()
                        .done(function () {
                            self.spinner.stop();
                        });
                });

            return this;
        },
        reloadView: function () {
            var self = this;

            this.container.prepend(this.spinner.render().$el);

            loadMessages()
                .done(function () {
                    self.spinner.stop();
                });
        }
    });

    return InboxView;
});