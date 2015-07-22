define([
    'underscore',
    'backbone',
    'views/message-nav',
    'text!template/message.html'
], function (_, Backbone, MessageNavView, MessageTemplate) {
    var MessageView = Backbone.View.extend({
        el: 'body',
        template: _.template(MessageTemplate),
        render: function () {
            var messageNavView = new MessageNavView({
                model: this.model
            });

            this.el.innerHTML = this.template(this.model.toJSON());
            this.el.appendChild(messageNavView.render().el);

            return this;
        }
    });

    return MessageView;
});
