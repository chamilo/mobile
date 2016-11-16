define([
    'backbone',
    'text!template/course-notebooks.html',
    'collection/course-notebooks',
    'view/course-notebook'
], function (Backbone, viewTemplate, CourseNotebooksCollection, CourseNotebookView) {
    var CourseNotebooksView = Backbone.View.extend({
        tagName: 'div',
        id: 'course-notebooks',
        className: 'page-inside',
        initialize: function (options) {
            this.collection = new CourseNotebooksCollection();
            this.collection
                .on('add', this.renderNotebook, this);
            this.collection
                .fetch(options)
                .fail(function (errorMessage) {
                    alert(errorMessage ? errorMessage : 'Course notebook failed');
                });

            this.render();
        },
        template: _.template(viewTemplate),
        render: function () {
            this.el
                .innerHTML = this.template();

            return this;
        },
        renderNotebook: function (notebook) {
            var courseNotebookView = new CourseNotebookView({
                model: notebook
            });

            this.$el
                .find('#ls-course-notebooks')
                .append(courseNotebookView.render().el);

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

    return CourseNotebooksView;
});

