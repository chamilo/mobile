define([
    'backbone',
    'text!template/course-forumcategory.html'
], function (Backbone, viewTemplate) {
    var CourseForumCategoryView = Backbone.View.extend({
        tagName: 'article',
        id: 'forum-category',
        className: 'panel panel-default',
        template: _.template(viewTemplate),
        render: function () {
            this.el.innerHTML = this.template(this.model.toJSON());

            return this;
        }
    });

    return CourseForumCategoryView;
});
