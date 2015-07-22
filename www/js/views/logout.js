define([
    'underscore',
    'backbone',
    'text!template/logout.html'
], function (_, Backbone, LogoutTemplate) {
    var LogoutView = Backbone.View.extend({
        className: 'container',
        template: _.template(LogoutTemplate),
        render: function () {
            this.el.innerHTML = this.template();

            return this;
        }
    });

    return LogoutView;
});
