define([
    'backbone',
    'text!template/course-lpcategories.html',
    'collection/course-lpcategories',
    'view/course-lpcategory-item'
], function (Backbone, viewTemplate, CourseLpCategoriesCollection, CourseLpCategoryItemView) {
    var CourseLpCategoriesView = Backbone.View.extend({
        tagName: 'div',
        id: 'course-lpcategories',
        className: 'page-inside',
        initialize: function (options) {
            this.collection = new CourseLpCategoriesCollection();
            this.collection
                .on('add', this.renderLpCategory, this);
            this.collection
                .fetch(options)
                .fail(function (errorMessage) {
                    alert(errorMessage ? errorMessage : 'Course learning paths failed');
                });

            this.render();
        },
        template: _.template(viewTemplate),
        render: function () {
            this.el
                .innerHTML = this.template();

            return this;
        },
        renderLpCategory: function (lpCategory) {
            var lpCategoryItemView = new CourseLpCategoryItemView({
                model: lpCategory
            });

            this.$el
                .find('#ls-course-lpcategories')
                .append(lpCategoryItemView.render().el);

            return this;
        },
        events: {
            'click #btn-back': 'btnBackOnClick'
        },
        btnBackOnClick: function (e) {
            e.preventDefault();

            window.history.back();
        }
    });

    return CourseLpCategoriesView;
});

