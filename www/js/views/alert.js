define([
    'underscore',
    'backbone',
    'text!template/alert.html'
], function (_, Backbone, AlertTemplate) {
    var AlertView = Backbone.View.extend({
        template: _.template(AlertTemplate),
        render: function () {
            this.el.innerHTML = this.template(this.model);

            return this;
        }
    });

    return AlertView;
});
