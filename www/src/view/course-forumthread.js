define([
    'backbone',
    'text!template/course-forumthread.html',
    'model/course-forumthread'
], function (Backbone, viewTemplate, CourseForumThreadModel) {
    var CourseForumThreadView = Backbone.View.extend({
        tagName: 'div',
        attributes: {
            id: 'forum-thread'
        },
        template: _.template(viewTemplate),
        initialize: function (options) {
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

            return this;
        }
    });

    return CourseForumThreadView;
});
