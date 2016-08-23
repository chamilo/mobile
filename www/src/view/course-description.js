define([
    'backbone',
    'text!template/course-description.html'
], function (Backbone, courseDescriptionTemplate) {
    var CourseDescriptionView = Backbone.View.extend({
        tagName: 'article',
        className: 'panel panel-default',
        template: _.template(courseDescriptionTemplate),
        render: function () {
            this.el.innerHTML = this.template(this.model.toJSON());

            return this;
        }
    });

    return CourseDescriptionView;
});
