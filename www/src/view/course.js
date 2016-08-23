define([
    'backbone',
    'text!template/course.html'
], function (Backbone, courseTemplate) {
    var CourseItemView = Backbone.View.extend({
        tagName: 'div',
        className: 'thumbnail',
        template: _.template(courseTemplate),
        render: function () {
            var html = this.template(
                this.model.toJSON()
            );

            this.$el
                .html(html);

            return this;
        }
    });

    return CourseItemView;
});
