define([
    'backbone',
    'text!template/home.html',
    'collection/courses',
    'view/course'
], function (Backbone, homeTemplate, CoursesCollection, CourseView) {
    var HomeView = Backbone.View.extend({
        el: 'body',
        template: _.template(homeTemplate),
        $lstCourses: null,
        initialize: function (attributes, options) {
            this.collection = new CoursesCollection();
            this.collection.on('add', this.onAddCourse, this);
        },
        render: function () {
            this.el.innerHTML = this.template();
            this.$lstCourses = this.$el.find('#lst-courses');
            
            this.collection.fetch();

            return this;
        },
        onAddCourse: function (course) {
            var courseView = new CourseView({
                    model: course
                });

            this.$lstCourses.append(
                courseView.render().$el
            );
        }
    });
    
    return HomeView;
});
