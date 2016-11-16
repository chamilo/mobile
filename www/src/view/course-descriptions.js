define([
    'backbone',
    'text!template/course-descriptions.html',
    'collection/course-descriptions',
    'view/course-description'
], function (Backbone, courseDescriptionsTemplate, CourseDescriptionsCollection, CourseDescriptionView) {
    var CourseDescriptionsView = Backbone.View.extend({
        tagName: 'div',
        className: 'page-inside',
        initialize: function (options) {
            this.collection = new CourseDescriptionsCollection();
            this.collection
                .on('add', this.renderDescription, this);
            this.collection
                .fetch({
                    campus: options.campus,
                    courseId: options.courseId
                })
                .fail(function (errorMessage) {
                    alert(errorMessage ? errorMessage : 'Course descriptions failed');
                });

            this.render();
        },
        template: _.template(courseDescriptionsTemplate),
        render: function () {
            this.el.innerHTML = this.template();

            return this;
        },
        renderDescription: function (description) {
            var courseDescriptionView = new CourseDescriptionView({
                model: description
            });

            this.$el
                .find('#ls-course-descriptions')
                .append(courseDescriptionView.render().el);

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

    return CourseDescriptionsView;
});

