define([
    'backbone',
    'text!template/course-document.html'
], function (Backbone, viewTemplate) {
    var CourseDocumentView = Backbone.View.extend({
        tagName: 'li',
        className: 'media',
        template: _.template(viewTemplate),
        render: function () {
            this.el.innerHTML = this.template(this.model.toJSON());

            return this;
        },
        events: {
            'click .btn-download': 'btnDownloadOnClick'
        },
        btnDownloadOnClick: function (e) {
            e.preventDefault();

            if (this.model.get('type') === 'file') {
                window.open(this.model.get('url'));

                return;
            }

            Backbone.history.navigate('#documents/' + window.sessionStorage.courseId + '/' + this.model.get('id'), {
                trigger: true
            });
        }
    });

    return CourseDocumentView;
});
