define([
    'underscore',
    'backbone',
    'text!template/inbox-message.html'
], function (_, Backbone, InboxMessageTemplate) {
    var InboxMessageView = Backbone.View.extend({
        tagName: 'a',
        className: 'list-group-item',
        template: _.template(InboxMessageTemplate),
        render: function () {
            this.el.setAttribute('href', '#message/' + this.model.cid);

            var template = this.template(this.model.toJSON());

            this.el.innerHTML = template;

            return this;
        }
    });

    return InboxMessageView;
});
