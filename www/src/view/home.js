define([
    'backbone',
    'text!template/home.html',
    'collection/courses',
    'collection/sessions',
    'view/course',
    'view/session-category',
    'view/spinner'
], function (
    Backbone,
    homeTemplate,
    CoursesCollection,
    SessionCollection,
    CourseView,
    SessionCategoryView,
    SpinnerView
) {
    var HomeView = Backbone.View.extend({
        tagName: 'div',
        className: 'page-inside',
        id: 'home',
        template: _.template(homeTemplate),
        $lstCourses: null,
        $lstSessionCategories: null,
        spinner: null,
        initialize: function () {
            this.courseCollection = new CoursesCollection();
            this.courseCollection.on('add', this.onAddCourse, this);

            this.sessionCollection = new SessionCollection();
            this.sessionCollection.on('add', this.onAddSession, this);

            this.spinner = new SpinnerView();
        },
        render: function () {
            var self = this;

            this.el.innerHTML = this.template();
            this.$lstCourses = this.$el.find('#lst-courses');
            this.$lstCourses.html(this.spinner.render().$el);
            this.$lstSessionCategories = this.$el.find('#lst-session-categories');

            $.when(
                    this.courseCollection.fetch(),
                    this.sessionCollection.fetch()
                )
                .done(function () {
                    if (self.courseCollection.length + self.sessionCollection.length > 0) {
                        self.spinner.stop();

                        return;
                    }

                    self.spinner.stopFailed();
                });

            return this;
        },
        onAddCourse: function (course, collection) {
            var courseView = new CourseView({
                    model: course
                });

            this.$lstCourses
                .append(
                    courseView.render().$el
                );
        },
        onAddSession: function (sessionCategory, collection) {
            var sessionCategoryView = new SessionCategoryView({
                    model: sessionCategory
                });

            this.$lstSessionCategories
                .append(
                    sessionCategoryView.render().$el
                );
        }
    });
    
    return HomeView;
});
