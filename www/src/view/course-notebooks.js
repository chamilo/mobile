define([
    'backbone',
    'text!template/course-notebooks.html',
    'collection/course-notebooks',
    'view/course-notebook',
    'view/spinner'
], function (Backbone, viewTemplate, CourseNotebooksCollection, CourseNotebookView, SpinnerView) {
    var CourseNotebooksView = Backbone.View.extend({
        tagName: 'div',
        id: 'course-notebooks',
        className: 'page-inside',
        spinner: null,
        container: null,
        initialize: function () {
            this.spinner = new SpinnerView();

            this.collection = new CourseNotebooksCollection();
            this.collection.on('add', this.renderNotebook, this);
        },
        template: _.template(viewTemplate),
        render: function () {
            var self = this;

            this.el.innerHTML = this.template();

            this.container = this.$el.find('#container');
            this.container.prepend(this.spinner.render().$el);

            this.collection.fetch()
                .always(function () {
                    if (!self.collection.length) {
                        self.spinner.stopFailed();
                    }
                });

            return this;
        },
        renderNotebook: function (notebook, notebooks) {
            if (notebooks.length === 1) {
                this.spinner.stop();
            }

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

