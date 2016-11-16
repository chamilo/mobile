define([
    'backbone',
    'text!template/course-forumthread.html',
    'model/course-forumthread',
    'view/course-forumpost-item',
    'model/course-forumpost',
    'view/spinner'
], function (
    Backbone,
    viewTemplate,
    CourseForumThreadModel,
    CourseForumPostItemView,
    CourseForumPostModel,
    SpinnerView
) {
    var CourseForumThreadView = Backbone.View.extend({
        tagName: 'div',
        className: 'page-inside',
        id: 'forum-thread',
        spinner: null,
        container: null,
        template: _.template(viewTemplate),
        initialize: function () {
            this.spinner = new SpinnerView();

            this.model = new CourseForumThreadModel();
            this.model.on('change', this.onChange, this);
        },
        render: function () {
            var self = this;

            this.el.innerHTML = this.template(
                    this.model.toJSON()
                );

            this.container = this.$el.find('#container');
            this.container.html(this.spinner.render().$el);

            this.model.fetch()
                .fail(function () {
                    self.spinner.stopFailed();
                });

            return this;
        },
        onChange: function (thread) {
            this.el.innerHTML = this.template(
                    thread.toJSON()
                );

            _.each(thread.get('posts'), this.renderPost, this);
        },
        renderPost: function (post) {
            var postView = new CourseForumPostItemView({
                model: post,
                courseId: this.model.get('cId')
            });

            this.$el
                .find('#lst-posts')
                .append(
                    postView.render().el
                );
        },
        events: {
            'submit #frm-reply': 'frmReplyOnSubmit'
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
                notify: this.$el.find('#chk-notify-' + id).is(':checked') ? 1 : 0
            })
                .done(function () {
                    var currentFragment = Backbone.history.fragment;

                    Backbone.history.fragment = null;
                    Backbone.history.navigate(currentFragment, true);

                    $('body').removeClass('modal-open');
                })
                .fail(function (errorMessage) {
                    alert(errorMessage ? errorMessage : 'Forum post not saved');
                });
        }
    });

    return CourseForumThreadView;
});
