define([
    'backbone',
    'text!template/courses.html',
    'collection/courses',
    'view/course'
], function (Backbone, coursesTemplate, CoursesCollection, CourseView) {
    var CoursesView = Backbone.View.extend({
        el: 'body',
        template: _.template(coursesTemplate),
        initialize: function (options) {
            this.collection = new CoursesCollection(null, {
                campus: options.campus
            });
            this.collection
                .on('add', this.renderCourse, this);
            this.collection
                .fetch()
                .fail(function (errorMessage) {
                    alert(errorMessage ? errorMessage : 'User courses failed');
                });

            this.render();
        },
        render: function () {
            this.$el
                .html(this.template());
            this.collection
                .each(this.renderCourse, this);

            return this;
        },
        renderCourse: function (course) {
            var courseView = new CourseView({
                model: course
            });

            this.$el
                .find('#courses-list')
                .append(
                    courseView.render().el
                );
        },
        events: {
            'click a#btn-close': 'btnCloseOnClick'
        },
        btnCloseOnClick: function (e) {
            e.preventDefault();

            window.history.back();
        }
    });

    return CoursesView;
});
