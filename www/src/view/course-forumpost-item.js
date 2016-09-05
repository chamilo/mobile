define([
    'backbone',
    'text!template/course-forumpost-item.html'
], function (Backbone, viewTemplate) {
    var CourseForumPostItemView = Backbone.View.extend({
        tagName: 'article',
        className: 'media',
        template: _.template(viewTemplate),
        render: function () {
            this.el
                .innerHTML = this.template(this.model.toJSON());

            return this;
        }
    });

    return CourseForumPostItemView;
});
