define([
    'backbone',
    'text!template/course-announcement.html',
    'model/course-announcement',
    'view/spinner'
], function (Backbone, viewTemplate, CourseAnnouncementModel, SpinnerView) {
    var CourseAnnouncementView = Backbone.View.extend({
        tagName: 'div',
        id: 'course-announcement',
        className: 'page-inside',
        spinner: null,
        container: null,
        template: _.template(viewTemplate),
        initialize: function () {
            this.spinner = new SpinnerView();

            this.model = new CourseAnnouncementModel();
            this.model.on('change', this.onChange, this);
        },
        render: function () {
            var self = this;

            this.el.innerHTML = this.template(
                    this.model.toJSON()
                );

            this.container = this.$el.find('#container');
            this.container.html(this.spinner.render().$el);

            this.model.fetch()
                .fail(function () {
                    if (!self.model.length) {
                        self.spinner.stopFailed();
                    }
                });

            return this;
        },
        onChange: function () {
            this.spinner.stop();

            this.el.innerHTML = this.template(
                    this.model.toJSON()
                );
        }
    });

    return CourseAnnouncementView;
});
