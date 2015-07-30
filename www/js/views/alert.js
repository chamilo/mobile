define([
    'underscore',
    'backbone',
    'text!template/alert.html'
], function (_, Backbone, AlertTemplate) {
    var AlertView = Backbone.View.extend({
        initialize: function () {
            this.render();
        },
        className: 'alert-container',
        template: _.template(AlertTemplate),
        render: function () {
            var self = this;

            this.el.innerHTML = this.template(this.model);

            document.body.appendChild(self.el);

            window.setTimeout(function () {
                document.body.removeChild(self.el);
            }, 3000);
        }
    });

    return AlertView;
});
