define([
    'backbone',
    'text!template/course-lpcategories.html',
    'collection/course-lpcategories',
    'view/course-lpcategory-item',
    'view/spinner'
], function (Backbone, viewTemplate, CourseLpCategoriesCollection, CourseLpCategoryItemView, SpinnerView) {
    var CourseLpCategoriesView = Backbone.View.extend({
        tagName: 'div',
        id: 'course-lpcategories',
        className: 'page-inside',
        spinner: null,
        container: null,
        initialize: function () {
            this.spinner = new SpinnerView();

            this.collection = new CourseLpCategoriesCollection();
            this.collection.on('add', this.renderLpCategory, this);
        },
        template: _.template(viewTemplate),
        render: function () {
            var self = this;

            this.el.innerHTML = this.template();

            this.container = this.$el.find('#container');
            this.container.prepend(this.spinner.render().$el);

            this.collection.fetch()
                .always(function () {
                    if (!self.collection.length) {
                        self.spinner.stopFailed();
                    }
                });

            return this;
        },
        renderLpCategory: function (lpCategory, categories) {
            if (categories.length === 1) {
                this.spinner.stop();
            }

            var lpCategoryItemView = new CourseLpCategoryItemView({
                model: lpCategory
            });

            this.$el
                .find('#ls-course-lpcategories')
                .append(lpCategoryItemView.render().el);

            return this;
        }
    });

    return CourseLpCategoriesView;
});

