define([
    'underscore',
    'backbone',
    'text!template/logout.html',
    'model/campus',
    'model/message'
], function (_, Backbone, template, CampusModel, MessageModel) {
    var LogoutView = Backbone.View.extend({
        tagName: 'div',
        id: 'sign-out',
        className: 'page-inside',
        template: _.template(template),
        initialize: function () {
            this.campus = new CampusModel();
            this.message = new MessageModel();
        },
        render: function () {
            this.el.innerHTML = this.template();

            return this;
        },
        onClear: function (success) {
            var clearCampus = this.campus.clear(),
                clearMessage = this.message.clear();

            $.when(clearCampus, clearMessage).done(function () {
                if (success) {
                    success();
                }

                window.location.href = 'index.html';
            });
        }
    });

    return LogoutView;
});
