define([
    'backbone',
    'text!template/course.html'
], function (Backbone, courseTemplate) {
    var CourseItemView = Backbone.View.extend({
        tagName: 'div',
        className: 'col-xs-12 col-sm-6 col-md-4 col-lg-3',
        template: _.template(courseTemplate),
        render: function () {
            var html = this.template(this.model.toJSON());

            this.$el.html(html);

            return this;
        }
    });

    return CourseItemView;
});
