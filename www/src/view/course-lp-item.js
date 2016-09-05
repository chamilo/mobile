define([
    'backbone',
    'text!template/course-lp-item.html',
    'model/course-lp'
], function (Backbone, viewTemplate, CourseLpModel) {
    var CourseLPCategoryItemView = Backbone.View.extend({
        tagName: 'li',
        className: 'list-group-item',
        initialize: function (options) {
            this.model = new CourseLpModel(options.data);
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
