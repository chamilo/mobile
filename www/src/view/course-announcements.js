define([
    'backbone',
    'text!template/course-announcements.html',
    'collection/course-announcements',
    'view/course-announcement-item'
], function (Backbone, viewTemplate, CourseAnnouncementsCollection, CourseAnnouncementItemView) {
    var CourseAnnouncementsView = Backbone.View.extend({
        tagName: 'div',
        attributes: {
            id: 'course-announcements'
        },
        template: _.template(viewTemplate),
        initialize: function (options) {
            this.collection = new CourseAnnouncementsCollection();
            this.collection
                .on('add', this.renderAnnouncement, this);
            this.collection
                .fetch(options)
                .fail(function (errorMessage) {
                    alert(errorMessage ? errorMessage : 'Course announcements failed');
                });
        },
        render: function () {
            this.el.innerHTML = this.template();

            return this;
        },
        renderAnnouncement: function (announcement) {
            var announcementItemView = new CourseAnnouncementItemView({
                model: announcement
            });
            
            this.$el
                .find('#ls-course-announcements')
                .append(announcementItemView.render().el);
            
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

    return CourseAnnouncementsView;
});
