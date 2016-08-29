define([
    'backbone',
    'text!template/course-forumcategories.html',
    'collection/course-forumcategories',
    'view/course-forumcategory'
], function (Backbone, viewTemplate, CourseForumCategoriesCollection, CourseForumCategoryView) {
    var courseId = 0;
    
    var CourseForumCategoriesView = Backbone.View.extend({
        tagName: 'div',
        attributes: {
            id: 'course-forumcategories'
        },
        initialize: function (options) {
            courseId = options.courseId;

            this.collection = new CourseForumCategoriesCollection();
            this.collection
                .on('add', this.renderForumCategory, this);
            this.collection
                .fetch(options)
                .fail(function (errorMessage) {
                    alert(errorMessage ? errorMessage : 'Course forum categories failed');
                });

            this.render();
        },
        template: _.template(viewTemplate),
        render: function () {
            this.el
                .innerHTML = this.template();

            return this;
        },
        renderForumCategory: function (forumCategory) {
            var courseForumCategoryView = new CourseForumCategoryView({
                model: forumCategory,
                courseId: courseId
            });

            this.$el
                .find('#ls-course-forumcategories')
                .append(courseForumCategoryView.render().el);

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

    return CourseForumCategoriesView;
});

