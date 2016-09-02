define([
    'backbone',
    'text!template/course-lpcategory-item.html'
], function (Backbone, viewTemplate) {
    var CourseLPCategoryItemView = Backbone.View.extend({
        tagName: 'div',
        attributes: {
            id: 'lpcategory'
        },
        template: _.template(viewTemplate),
        render: function () {
            this.el
                .innerHTML = this.template(this.model.toJSON());

            return this;
        }
    });

    return CourseLPCategoryItemView;
});
