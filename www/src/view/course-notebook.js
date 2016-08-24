define([
    'backbone',
    'text!template/course-notebook.html'
], function (Backbone, viewTemplate) {
    var CourseNotebookView = Backbone.View.extend({
        tagName: 'article',
        className: 'panel panel-default',
        template: _.template(viewTemplate),
        render: function () {
            this.el
                .innerHTML = this.template(this.model.toJSON());

            return this;
        }
    });

    return CourseNotebookView;
});
