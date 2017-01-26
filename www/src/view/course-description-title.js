define([
    'backbone',
    'text!template/course-description-title.html'
], function (Backbone, courseDescriptionTemplate) {
    var CourseDescriptionView = Backbone.View.extend({
        tagName: 'li',
        attributes: {
            'role': 'presentation'
        },
        template: _.template(courseDescriptionTemplate),
        render: function () {
            this.$el
                .html(
                    this.template(this.model.toJSON())
                )
                .addClass(this.model.get('id') == 1 ? 'active' : '');

            return this;
        }
    });

    return CourseDescriptionView;
});
