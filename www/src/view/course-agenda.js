define([
    'backbone',
    'text!template/course-agenda.html',
    'collection/course-events',
    'view/course-event',
    'view/spinner'
], function (Backbone, viewTemplate, CourseEventsCollection, CourseEventView, SpinnerView) {
    var CourseAgendaView = Backbone.View.extend({
        tagName: 'div',
        className: 'page-inside',
        id: 'course-agenda',
        spinner: null,
        container: null,
        template: _.template(viewTemplate),
        initialize: function () {
            this.spinner = new SpinnerView();

            this.collection = new CourseEventsCollection();
            this.collection.on('add', this.renderEvent, this);
        },
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
        renderEvent: function (event, events) {
            if (events.length === 1) {
                this.spinner.stop();
            }

            var courseEventView = new CourseEventView({
                model: event
            });

            this.$el.find('#ls-course-agenda')
                .append(courseEventView.render().el);

            return this;
        }
    });

    return CourseAgendaView;
});
