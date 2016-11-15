define([
    'backbone',
    'text!template/home.html',
    'collection/courses',
    'view/course',
    'view/spinner'
], function (Backbone, homeTemplate, CoursesCollection, CourseView, SpinnerView) {
    var HomeView = Backbone.View.extend({
        el: 'body',
        template: _.template(homeTemplate),
        $lstCourses: null,
        spinner: null,
        initialize: function () {
            this.collection = new CoursesCollection();
            this.collection.on('add', this.onAddCourse, this);

            this.spinner = new SpinnerView();
        },
        render: function () {
            var self = this;

            this.el.innerHTML = this.template();
            this.$lstCourses = this.$el.find('#lst-courses');
            this.$lstCourses.html(this.spinner.render().$el);

            this.collection.fetch()
                .done(function () {
                    if (self.collection.length) {
                        return;
                    }

                    self.spinner.stopFailed();
                });

            return this;
        },
        onAddCourse: function (course, collection) {
            if (collection.length === 1) {
                this.spinner.stop();
            }

            var courseView = new CourseView({
                    model: course
                });

            this.$lstCourses
                .append(
                    courseView.render().$el
                );
        }
    });
    
    return HomeView;
});
