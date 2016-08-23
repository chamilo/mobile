define([
    'backbone',
    'text!template/course-home.html',
    'model/course'
], function (Backbone, courseHomeTemplate, CourseModel) {
    var CourseHomeView = Backbone.View.extend({
        el: 'body',
        template: _.template(courseHomeTemplate),
        initialize: function (options) {
            this.model = new CourseModel();
            this.model.cid = options.courseId;
            this.model
                .fetch({
                    request: {
                        baseUrl: options.campus.url,
                        apiKey: options.campus.apiKey,
                        username: options.campus.username
                    }
                })
                .fail(function (errorMessage) {
                    alert(errorMessage ? errorMessage : 'Course info failed');
                });
            this.model
                .on('change', this.render, this);
        },
        render: function () {
            this.el
                .innerHTML = this.template(this.model.toJSON());

            return this;
        }
    });

    return CourseHomeView;
});
