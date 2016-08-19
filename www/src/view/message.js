define([
    'backbone',
    'text!template/message.html',
    'model/message',
    'view/message-nav'
], function (
    Backbone,
    messageTemplate,
    MessageModel,
    MessageNavView
) {
    var MessageView = Backbone.View.extend({
        el: 'body',
        template: _.template(messageTemplate),
        navView: null,
        initialize: function (options) {
            this.model = new MessageModel();
            this.model.cid = options.messageId;
            this.model.fetch();
            this.model.on('change', this.render, this);

            this.navView = new MessageNavView({
                model: this.model
            });
        },
        render: function () {
            if (!this.model.get('messageId')) {
                return this;
            }
            
            this.el.innerHTML = this.template(
                this.model.toJSON()
            );
            this.el.appendChild(
                this.navView.render().el
            );

            return this;
        }
    });

    return MessageView;
});
