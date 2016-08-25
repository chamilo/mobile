define([
    'backbone',
    'text!template/course-documents.html',
    'collection/course-documents',
    'view/course-document'
], function (Backbone, viewTemplate, CourseDocumentsCollection, CourseDocumentView) {
    var courseId = 0;
    
    var CourseDocumentsView = Backbone.View.extend({
        tagName: 'div',
        attributes: {
            id: 'course-documents'
        },
        initialize: function (options) {
            courseId = options.courseId;

            this.collection = new CourseDocumentsCollection();
            this.collection
                .on('add', this.renderDocument, this);
            this.collection
                .fetch(options)
                .fail(function (errorMessage) {
                    alert(errorMessage ? errorMessage : 'Course documents failed');
                });

            this.render();
        },
        template: _.template(viewTemplate),
        render: function () {
            this.el
                .innerHTML = this.template();

            return this;
        },
        renderDocument: function (document) {
            document.updateIcon();

            var courseDocumentView = new CourseDocumentView({
                model: document,
                courseId: courseId
            });

            this.$el
                .find('#ls-course-documents')
                .append(courseDocumentView.render().el);

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

    return CourseDocumentsView;
});

