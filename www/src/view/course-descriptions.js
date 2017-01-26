define([
    'backbone',
    'text!template/course-descriptions.html',
    'collection/course-descriptions',
    'view/course-description-title',
    'view/course-description-content',
    'view/spinner'
], function (
    Backbone,
    courseDescriptionsTemplate,
    CourseDescriptionsCollection,
    CourseDescriptionTitleView,
    CourseDescriptionContentView,
    SpinnerView
) {
    var CourseDescriptionsView = Backbone.View.extend({
        tagName: 'div',
        className: 'page-inside',
        spinner: null,
        container: null,
        initialize: function () {
            this.spinner = new SpinnerView();

            this.collection = new CourseDescriptionsCollection();
            this.collection.on('add', this.renderDescription, this);
        },
        template: _.template(courseDescriptionsTemplate),
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

                    self.container.find('#ls-course-descriptions .nav.nav-tabs a')
                        .click(function (e) {
                            e.preventDefault()
                            $(this).tab('show')
                        });
                });

            return this;
        },
        renderDescription: function (description, descriptions) {
            if (descriptions.length === 1) {
                this.spinner.stop();
            }

            var descriptionTitleView = new CourseDescriptionTitleView({
                model: description
            });

            var descriptionContentView = new CourseDescriptionContentView({
                model: description
            });

            this.$el
                .find('#ls-course-descriptions ul.nav.nav-tabs')
                .append(descriptionTitleView.render().$el);

            this.$el
                .find('#ls-course-descriptions div.tab-content')
                .append(descriptionContentView.render().$el);

            return this;
        }
    });

    return CourseDescriptionsView;
});

