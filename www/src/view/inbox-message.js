define([
    'backbone',
    'text!template/inbox-message.html'
], function (Backbone, inboxMessageTemplate) {
    var InboxMessageView = Backbone.View.extend({
        tagName: 'a',
        className: 'list-group-item',
        template: _.template(inboxMessageTemplate),
        render: function () {
            this.el.setAttribute('href', '#message/' + this.model.cid);

            this.el.innerHTML = this.template(this.model.toJSON());

            return this;
        }
    });

    return InboxMessageView;
});