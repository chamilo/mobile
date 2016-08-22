define([
    'backbone',
    'text!template/user-profile.html',
    'model/user'
], function (Backbone, userProfileTemplate, UserModel) {
    var campus = null;

    var UserProfileView = Backbone.View.extend({
        el: 'body',
        initialize: function (options) {
            campus = options.capus;
            
            this.model = new UserModel();
            this.model.fetch({
                campus: options.campus,
                error: function (errorMessage) {
                    alert(errorMessage);
                }
            });
            this.model.on('change', this.render, this);
        },
        template: _.template(userProfileTemplate),
        render: function () {
            this.el.innerHTML = this.template(
                this.model.toJSON()
            );

            return this;
        },
        events: {
            'click a#btn-close': 'btnCloseOnClick'
        },
        btnCloseOnClick: function (e) {
            e.preventDefault();

            window.history.back();
        }
    });

    return UserProfileView;
});
