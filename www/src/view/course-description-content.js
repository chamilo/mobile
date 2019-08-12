define([
    'backbone',
    'text!template/course-description-content.html'
], function (Backbone, courseDescriptionTemplate) {
    var CourseDescriptionView = Backbone.View.extend({
        tagName: 'article',
        className: 'tab-pane fade',
        attributes: {
            'role': 'tabpanel'
        },
        template: _.template(courseDescriptionTemplate),
        render: function () {
            var id = this.model.get('id');

            this.$el
                .html(
                    this.template(this.model.toJSON())
                )
                .attr('id', 'description-' + id);

            return this;
        }
    });

    return CourseDescriptionView;
});
