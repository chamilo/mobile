define([
    'backbone',
    'text!template/course-documents.html',
    'collection/course-documents',
    'view/course-document',
    'view/spinner'
], function (Backbone, viewTemplate, CourseDocumentsCollection, CourseDocumentView, SpinnerView) {
    var CourseDocumentsView = Backbone.View.extend({
        id: 'course-documents',
        tagName: 'div',
        className: 'page-inside',
        spinner: null,
        container: null,
        initialize: function () {
            this.spinner = new SpinnerView();

            this.collection = new CourseDocumentsCollection();
            this.collection.on('add', this.renderDocument, this);
        },
        template: _.template(viewTemplate),
        render: function () {
            var self = this;

            this.el.innerHTML = this.template();

            this.container = this.$el.find('#container');
            this.container.prepend(this.spinner.render().$el);

            this.collection.fetch()
                .always(function () {
                    if (self.collection.length) {
                        return;
                    }

                    self.spinner.stopFailed();
                });

            return this;
        },
        renderDocument: function (document, documents) {
            if (documents.length === 1) {
                this.spinner.stop();
            }

            document.updateIcon();

            var courseDocumentView = new CourseDocumentView({
                model: document
            });

            this.$el
                .find('#ls-course-documents')
                .append(courseDocumentView.render().el);

            return this;
        }
    });

    return CourseDocumentsView;
});

