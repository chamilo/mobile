define([
    'backbone',
    'text!template/course-announcement-item.html'
], function (Backbone, viewTemplate) {
    var CourseDescriptionItemView = Backbone.View.extend({
        tagName: 'a',
        className: 'list-group-item',
        attributes: {
            href: '#'
        },
        template: _.template(viewTemplate),
        render: function () {
            this.el.innerHTML = this.template(this.model.toJSON());

            return this;
        }
    });

    return CourseDescriptionItemView;
});
