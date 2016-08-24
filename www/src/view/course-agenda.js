define([
    'backbone',
    'text!template/course-agenda.html',
    'collection/course-events',
    'view/course-event'
], function (Backbone, viewTemplate, CourseEventsCollection, CourseEventView) {
    var CourseAgendaView = Backbone.View.extend({
        tagName: 'div',
        attributes: {
            id: 'course-agenda'
        },
        template: _.template(viewTemplate),
        initialize: function (options) {
            this.collection = new CourseEventsCollection();
            this.collection
                .on('add', this.renderEvent, this);
            this.collection
                .fetch(options)
                .fail(function (errorMessage) {
                    alert(errorMessage ? errorMessage : 'Course agenda failed');
                });
        },
        render: function () {
            this.el
                .innerHTML = this.template();

            return this;
        },
        renderEvent: function (event) {
            var courseEventView = new CourseEventView({
                model: event
            });
            
            this.$el
                .find('#ls-course-agenda')
                .append(courseEventView.render().el);
            
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

    return CourseAgendaView;
});
