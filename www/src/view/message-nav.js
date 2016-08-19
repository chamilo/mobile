define([
    'backbone',
    'text!template/message-nav.html'
], function (
    Backbone,
    MessageNavTemplate
) {
    var previousMessage = null,
        nextMessage = null;

    var MessageNavView = Backbone.View.extend({
        tagName: 'nav',
        className: 'navbar navbar-default navbar-fixed-bottom',
        attributes: {
            role: 'navigation'
        },
        template: _.template(MessageNavTemplate),
        prevButton: null,
        nextButton: null,
        events: {
            'click a#prev-message': 'btnPrevMessageOnClick',
            'click a#next-message': 'btnNextMessageOnClick'
        },
        render: function () {
            var self = this;
            this.el.innerHTML = this.template(this.model.toJSON());

            this.prevButton = self.$('#prev-message');
            this.nextButton = self.$('#next-message');

            this.model.previous({
                success: function (message) {
                    if (!message) {
                        return;
                    }

                    previousMessage = message;

                    self.prevButton.parent().removeClass('disabled');
                }
            });
            this.model.next({
                success: function (message) {
                    if (!message) {
                        return;
                    }

                    nextMessage = message;

                    self.nextButton.parent().removeClass('disabled');
                }
            });

            return this;
        },
        btnPrevMessageOnClick: function (e) {
            e.preventDefault();

            if (this.prevButton.parent().hasClass('disabled')) {
                return;
            }

            this.model.set(previousMessage.toJSON());
        },
        btnNextMessageOnClick: function (e) {
            e.preventDefault();

            if (this.nextButton.parent().hasClass('disabled')) {
                return;
            }

            this.model.set(nextMessage.toJSON());
        }
    });

    return MessageNavView;
});
