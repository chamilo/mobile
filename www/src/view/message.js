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
        tagName: 'div',
        className: 'page-inside',
        template: _.template(messageTemplate),
        btnPrev: null,
        btnNext: null,
        initialize: function (options) {
            var self = this;

            this.model = new MessageModel();
            this.model.id = options.messageId;
            this.model.cid = options.messageId;
            this.model.fetch({
                success: function () {
                    self.model.save({ beenSeen: true });
                }
            });
            this.model.on('change', this.render, this);
        },
        events: {
            'click button#prev-message': 'btnPrevMessageOnClick',
            'click button#next-message': 'btnNextMessageOnClick'
        },
        render: function () {
            if (!this.model.get('messageId')) {
                return this;
            }

            var self = this;

            this.el.innerHTML = this.template(this.model.toJSON());

            this.btnPrev = this.$el.find('#prev-message');
            this.btnNext = this.$el.find('#next-message');

            this.model.previous({
                success: function (message) {
                    if (!message) {
                        return;
                    }

                    previousMessage = message;

                    self.btnPrev.removeClass('hide');
                }
            });
            this.model.next({
                success: function (message) {
                    if (!message) {
                        return;
                    }

                    nextMessage = message;

                    self.btnNext.removeClass('hide');
                }
            });

            return this;
        },
        btnPrevMessageOnClick: function (e) {
            e.preventDefault();

            if (this.btnPrev.is('.hide')) {
                return;
            }

            this.model.set(previousMessage.toJSON());
            previousMessage.save({ beenSeen: true });
        },
        btnNextMessageOnClick: function (e) {
            e.preventDefault();

            if (this.btnNext.is('.disabled')) {
                return;
            }

            this.model.set(nextMessage.toJSON());
            nextMessage.save({ beenSeen: true });
        }
    });

    return MessageView;
});
