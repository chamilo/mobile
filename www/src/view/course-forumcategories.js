define([
    'backbone',
    'text!template/course-forumcategories.html',
    'collection/course-forumcategories',
    'view/course-forumcategory',
    'view/spinner'
], function (Backbone, viewTemplate, CourseForumCategoriesCollection, CourseForumCategoryView, SpinnerView) {
    var CourseForumCategoriesView = Backbone.View.extend({
        tagName: 'div',
        className: 'page-inside',
        id: 'course-forumcategories',
        spinner: null,
        container: null,
        initialize: function () {
            this.spinner = new SpinnerView();

            this.collection = new CourseForumCategoriesCollection();
            this.collection.on('add', this.renderForumCategory, this);
        },
        template: _.template(viewTemplate),
        render: function () {
            var self = this;

            this.el.innerHTML = this.template();

            this.container = this.$el.find('#container');
            this.container.prepend(this.spinner.render().$el);

            this.collection.fetch()
                .always(function () {
                    if (!self.collection.length) {
                        self.spinner.stopFailed();
                    }
                });

            return this;
        },
        renderForumCategory: function (forumCategory, categories) {
            if (categories.length === 1) {
                this.spinner.stop();
            }

            var courseForumCategoryView = new CourseForumCategoryView({
                model: forumCategory
            });

            this.$el.find('#ls-course-forumcategories')
                .append(courseForumCategoryView.render().el);

            return this;
        }
    });

    return CourseForumCategoriesView;
});

