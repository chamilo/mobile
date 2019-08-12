define([
    'backbone',
    'text!template/course-lpcategory-item.html',
    'view/course-lp-item'
], function (Backbone, viewTemplate, CourseLpItemView) {
    var CourseLPCategoryItemView = Backbone.View.extend({
        tagName: 'div',
        attributes: {
            id: 'lpcategory'
        },
        template: _.template(viewTemplate),
        render: function () {
            this.el
                .innerHTML = this.template(this.model.toJSON());

            _.each(this.model.get('learnpaths'), this.renderLp, this);

            return this;
        },
        renderLp: function (lpData) {
            var lpView = new CourseLpItemView({
                data: lpData
            });

            this.$el
                .find('#lst-learning-paths-' + this.model.get('id'))
                .append(lpView.render().el);
        }
    });

    return CourseLPCategoryItemView;
});
