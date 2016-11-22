define([
    'backbone',
    'text!template/session-category.html'
], function (Backbone, template) {
    var SessionCategoryView = Backbone.View.extend({
        tagName: 'div',
        template: _.template(template),
        render: function () {
            this.el.id = 'session-category-' + this.model.id;
            this.el.innerHTML = this.template(this.model.toJSON());

            return this;
        }
    });

    return SessionCategoryView;
});
