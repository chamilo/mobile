define([
    'underscore',
    'backbone',
    'text!template/message-nav.html'
], function (_, Backbone, MessageNavTemplate) {
    var MessageNavView = Backbone.View.extend({
        tagName: 'nav',
        className: 'navbar navbar-default navbar-fixed-bottom',
        attribute: {
            role: 'navigation'
        },
        template: _.template(MessageNavTemplate),
        prevButton: null,
        nextButton: null,
        events: {
            'click li a': 'checkLinkOnClick'
        },
        render: function () {
            var self = this;
            this.el.innerHTML = this.template(this.model.toJSON());

            this.prevButton = self.$('#prev-message');
            this.nextButton = self.$('#next-message');

            this.prevButton.parent().addClass('disabled');
            this.nextButton.parent().addClass('disabled');

            var getPrevious = this.model.getPrevious();
            var getNext = this.model.getNext();

            $.when.apply($, [
                getPrevious, getNext
            ]).then(function (previousMessage, nextMessage) {
                if (previousMessage) {
                    self.prevButton.parent().removeClass('disabled');
                    self.prevButton.attr({
                        href: '#message/' + previousMessage.cid
                    });
                }

                if (nextMessage) {
                    self.nextButton.parent().removeClass('disabled');
                    self.nextButton.attr({
                        href: '#message/' + nextMessage.cid
                    });
                }
            });

            return this;
        },
        checkLinkOnClick: function (e) {
            if ($(e.target).parent().hasClass('disabled')) {
                e.preventDefault();
            }
        }
    });

    return MessageNavView;
});