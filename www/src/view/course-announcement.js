define([
    'backbone',
    'text!template/course-announcement.html',
    'model/course-announcement'
], function (Backbone, viewTemplate, CourseAnnouncementModel) {
    var CourseAnnouncementView = Backbone.View.extend({
        tagName: 'div',
        attributes: {
            id: 'course-announcement'
        },
        template: _.template(viewTemplate),
        initialize: function (options) {
            this.model = new CourseAnnouncementModel();
            this.model
                .on('change', this.render, this);
            this.model
                .fetch(options)
                .fail(function (errorMessage) {
                    alert(errorMessage ? errorMessage : 'Course announcement failed');
                });
        },
        render: function () {
            this.el
                .innerHTML = this.template(this.model.toJSON());

            return this;
        },
        events: {
            'click #btn-back': 'btnBackOnClick'
        },
        btnBackOnClick: function (e) {
            e.preventDefault();

            window.history.back();
        }
    });

    return CourseAnnouncementView;
});
