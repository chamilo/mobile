define([
    'underscore',
    'backbone',
    'text!template/course-home.html',
    'model/course',
    'view/spinner'
], function (_, Backbone, courseHomeTemplate, CourseModel, SpinnerView) {
    var CourseHomeView = Backbone.View.extend({
        tagName: 'div',
        className: 'page-inside',
        template: _.template(courseHomeTemplate),
        spinner: null,
        lblTitle: null,
        container: null,
        initialize: function () {
            this.model = new CourseModel();
            this.model.cid = window.sessionStorage.getItem('courseId');
            this.model.on('change', this.onChange, this);

            this.spinner = new SpinnerView();
        },
        render: function () {
            var self = this;

            this.el.innerHTML = this.template(this.model.toJSON());
            this.lblTitle = this.$el.find('#lbl-title');

            this.container = this.$el.find('#container');
            this.container.html(this.spinner.render().$el);

            this.model.fetch()
                .fail(function () {
                    self.spinner.stopFailed();
                });

            return this;
        },
        onChange: function (course) {
            this.spinner.stop();

            this.el.innerHTML = this.template(course.toJSON());
        }
    });

    return CourseHomeView;
});
