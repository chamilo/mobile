define([
    'backbone',
    'text!template/course-forum.html',
    'model/course-forum'
], function (Backbone, viewTemplate, CourseForumModel) {
    var CourseForumView = Backbone.View.extend({
        tagName: 'div',
        attributes: {
            id: 'course-forum'
        },
        initialize: function (options) {
            this.model = new CourseForumModel();
            this.model
                .on('change', this.render, this);
            this.model
                .fetch(options)
                .fail(function (errorMessage) {
                    alert(errorMessage ? errorMessage : 'Course forum failed');
                });
        },
        template: _.template(viewTemplate),
        render: function () {
            if (this.model.get('id')) {
                this.el
                    .innerHTML = this.template(this.model.toJSON());
            }

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

    return CourseForumView;
});
