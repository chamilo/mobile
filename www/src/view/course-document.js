define([
    'backbone',
    'text!template/course-document.html'
], function (Backbone, viewTemplate) {
    var courseId = 0;

    var CourseDocumentView = Backbone.View.extend({
        tagName: 'li',
        className: 'media',
        template: _.template(viewTemplate),
        initialize: function (options) {
            courseId = options.courseId;
            path = options.path;
        },
        render: function () {
            this.el
                .innerHTML = this.template(this.model.toJSON());

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

            Backbone.history.navigate('#documents/' + courseId + '/' + this.model.get('id'), {
                trigger: true
            });
        }
    });

    return CourseDocumentView;
});
