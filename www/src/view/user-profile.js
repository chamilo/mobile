define([
    'backbone',
    'text!template/user-profile.html',
    'model/user',
    'view/spinner'
], function (Backbone, userProfileTemplate, UserModel, SpinnerView) {
    var UserProfileView = Backbone.View.extend({
        tagName: 'div',
        className: 'page-inside',
        spinner: null,
        container: null,
        initialize: function () {
            this.spinner = new SpinnerView();

            this.model = new UserModel();
            this.model.on('change', this.onChange, this);
        },
        template: _.template(userProfileTemplate),
        render: function () {
            var self = this;

            this.el.innerHTML = this.template(this.model.toJSON());

            this.container = this.$el.find('#container');
            this.container.html(this.spinner.render().$el);

            this.model.fetch()
                .fail(function () {
                    self.spinner.stopFailed();
                });

            return this;
        },
        onChange: function () {
            this.el.innerHTML = this.template(this.model.toJSON());
        }
    });

    return UserProfileView;
});
