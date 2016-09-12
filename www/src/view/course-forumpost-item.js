define([
    'backbone',
    'text!template/course-forumpost-item.html',
    'model/course-forumpost'
], function (Backbone, viewTemplate, CourseForumPostModel) {
    var campus = null,
        courseId = 0;

    var CourseForumPostItemView = Backbone.View.extend({
        tagName: 'article',
        className: 'media',
        template: _.template(viewTemplate),
        initialize: function (options) {
            campus = options.campus;
            courseId = options.courseId;
        },
        render: function () {
            this.el
                .innerHTML = this.template(this.model.toJSON());

            return this;
        },
        events: {
            'show.bs.modal aside.modal': 'modalOnShow',
            'submit form': 'frmOnSubmit'
        },
        frmOnSubmit: function (e) {
            e.preventDefault();
            
            var id = this.model.get('id'),
                forumPost = new CourseForumPostModel();

            var text = this.$el.find('#txt-text-' + id).val();

            if (!$('#lbl-quote-' + id).is('hidden')) {
                text = $('#lbl-quote-' + id).html() + text;
            }

            forumPost.save({
                title: this.$el.find('#txt-title-' + id).val(),
                text: text,
                parentId: this.$el.find('#txt-parent-' + id).val(),
                forumId: this.$el.find('#txt-forum-' + id).val(),
                threadId: this.$el.find('#txt-thread-' + id).val()
            }, {
                courseId: courseId,
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
        },
        modalOnShow: function (e) {
            var button = $(e.relatedTarget);

            if (!button.data('isquote')) {
                this.$el
                    .find('#lbl-quote-' + this.model.get('id'))
                    .addClass('hidden');

                return;
            }

            this.$el
                .find('#lbl-quote-' + this.model.get('id'))
                .removeClass('hidden');
        }
    });

    return CourseForumPostItemView;
});
