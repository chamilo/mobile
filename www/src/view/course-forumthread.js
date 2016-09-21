define([
    'backbone',
    'text!template/course-forumthread.html',
    'model/course-forumthread',
    'view/course-forumpost-item',
    'model/course-forumpost'
], function (Backbone, viewTemplate, CourseForumThreadModel, CourseForumPostItemView, CourseForumPostModel) {
    var campus = null;

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
        },
        events: {
            'click #btn-back': 'btnBackOnClick',
            'submit #frm-reply': 'frmReplyOnSubmit'
        },
        btnBackOnClick: function (e) {
            e.preventDefault();

            window.history.back();
        },
        frmReplyOnSubmit: function (e) {
            e.preventDefault();

            var id = this.model.get('id'),
                forumPost = new CourseForumPostModel();

            forumPost.save({
                title: this.$el.find('#txt-reply-title').val(),
                text: this.$el.find('#txt-reply-text').val(),
                forum: this.$el.find('#txt-reply-forum').val(),
                threadId: this.$el.find('#txt-reply-thread').val()
            }, {
                courseId: window.sessionStorage.getItem('courseId'),
                notify: this.$el.find('#chk-notify-' + id).is(':checked') ? 1 : 0,
                campus: campus
            })
                .done(function () {
                    var currentFragment = Backbone.history.fragment;

                    Backbone.history.fragment = null;
                    Backbone.history.navigate(currentFragment, true);
                })
                .fail(function (errorMessage) {
                    alert(errorMessage ? errorMessage : 'Forum post not saved');
                });
        }
    });

    return CourseForumThreadView;
});
