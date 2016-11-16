define([
    'backbone',
    'text!template/course-descriptions.html',
    'collection/course-descriptions',
    'view/course-description',
    'view/spinner'
], function (Backbone, courseDescriptionsTemplate, CourseDescriptionsCollection, CourseDescriptionView, SpinnerView) {
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
                });

            return this;
        },
        renderDescription: function (description, descriptions) {
            if (descriptions.length === 1) {
                this.spinner.stop();
            }

            var courseDescriptionView = new CourseDescriptionView({
                model: description
            });

            this.$el
                .find('#ls-course-descriptions')
                .append(courseDescriptionView.render().el);

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

    return CourseDescriptionsView;
});

