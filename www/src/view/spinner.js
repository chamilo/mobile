define([
    'underscore',
    'backbone',
    'text!template/spinner.html',
    'model/spinner'
], function (_, Backbone, template, SpinnerModel) {
    var SpinnerView = Backbone.View.extend({
        tagName: 'div',
        className: 'text-center',
        template: _.template(template),
        initialize: function () {
            this.model = new SpinnerModel();
            this.model.on('change', this.onChange, this);
        },
        render: function () {
            this.el.innerHTML = this.template(this.model.toJSON());

            return this;
        },
        start: function () {
            this.model.set({
                loading: true,
                noContent: false
            });
        },
        stopFailed: function () {
            this.model.set({
                loading: false,
                noContent: true
            });
        },
        stop: function () {
            this.$el.detach();
        },
        onChange: function (model, options) {
            this.render();
        }
    });

    return SpinnerView;
});