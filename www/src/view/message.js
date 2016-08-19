define([
    'backbone',
    'text!template/message.html',
    'model/message'
], function (
    Backbone,
    messageTemplate,
    MessageModel
) {
    var previousMessage = null,
        nextMessage = null;

    var MessageView = Backbone.View.extend({
        el: 'body',
        template: _.template(messageTemplate),
        btnClose: null,
        btnPrev: null,
        btnNext: null,
        initialize: function (options) {
            this.model = new MessageModel();
            this.model.cid = options.messageId;
            this.model.fetch();
            this.model.on('change', this.render, this);
        },
        events: {
            'click a#btn-close': 'btnCloseOnClick',
            'click a#prev-message': 'btnPrevMessageOnClick',
            'click a#next-message': 'btnNextMessageOnClick'
        },
        render: function () {
            if (!this.model.get('messageId')) {
                return this;
            }

            var self = this;

            this.el.innerHTML = this.template(
                this.model.toJSON()
            );

            this.btnPrev = this.$('#prev-message');
            this.btnNext = this.$('#next-message');

            this.model.previous({
                success: function (message) {
                    if (!message) {
                        return;
                    }

                    previousMessage = message;

                    self.btnPrev.parent().removeClass('disabled');
                }
            });
            this.model.next({
                success: function (message) {
                    if (!message) {
                        return;
                    }

                    nextMessage = message;

                    self.btnNext.parent().removeClass('disabled');
                }
            });

            return this;
        },
        btnCloseOnClick: function (e) {
            e.preventDefault();

            window.history.back();
        },
        btnPrevMessageOnClick: function (e) {
            e.preventDefault();

            if (this.btnPrev.parent().hasClass('disabled')) {
                return;
            }

            this.model.set(previousMessage.toJSON());
        },
        btnNextMessageOnClick: function (e) {
            e.preventDefault();

            if (this.btnNext.parent().hasClass('disabled')) {
                return;
            }

            this.model.set(nextMessage.toJSON());
        }
    });

    return MessageView;
});
