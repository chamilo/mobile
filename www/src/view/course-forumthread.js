define([
    'backbone',
    'text!template/course-forumthread.html',
    'model/course-forumthread',
    'view/course-forumpost-item'
], function (Backbone, viewTemplate, CourseForumThreadModel, CourseForumPostItemView) {
    var campus = null,
        courseId = 0;

    var CourseForumThreadView = Backbone.View.extend({
        tagName: 'div',
        attributes: {
            id: 'forum-thread'
        },
        template: _.template(viewTemplate),
        initialize: function (options) {
            campus = options.campus;

            this.model = new CourseForumThreadModel();
            this.model
                .on('change', this.render, this);
            this.model
                .fetch(options)
                .fail(function (errorMessage) {
                    alert(errorMessage ? errorMessage : 'Forum thread failed');
                });
        },
        render: function () {
            if (this.model.get('id')) {
                this.el
                    .innerHTML = this.template(this.model.toJSON());
            }

            _.each(this.model.get('posts'), this.renderPost, this);

            return this;
        },
        renderPost: function (post) {
            var postView = new CourseForumPostItemView({
                model: post,
                campus: campus,
                courseId: this.model.get('cId')
            });

            this.$el
                .find('#lst-posts')
                .append(
                    postView.render().el
                );
        }
    });

    return CourseForumThreadView;
});
