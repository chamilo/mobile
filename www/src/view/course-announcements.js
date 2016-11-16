define([
    'backbone',
    'text!template/course-announcements.html',
    'collection/course-announcements',
    'view/course-announcement-item',
    'view/spinner'
], function (Backbone, viewTemplate, CourseAnnouncementsCollection, CourseAnnouncementItemView, SpinnerView) {
    var CourseAnnouncementsView = Backbone.View.extend({
        tagName: 'div',
        id: 'course-announcements',
        className: 'page-inside',
        template: _.template(viewTemplate),
        spinner: null,
        container: null,
        initialize: function () {
            this.spinner = new SpinnerView();

            this.collection = new CourseAnnouncementsCollection();
            this.collection.on('add', this.renderAnnouncement, this);
        },
        render: function () {
            var self = this;

            this.el.innerHTML = this.template();

            this.container = this.$el.find('#container');
            this.container.prepend(this.spinner.render().el);

            this.collection.fetch()
                .always(function () {
                    if (!self.collection.length) {
                        self.spinner.stopFailed();
                    }
                });

            return this;
        },
        renderAnnouncement: function (announcement, announcements) {
            if (announcements.length === 1) {
                this.spinner.stop();
            }

            var announcementItemView = new CourseAnnouncementItemView({
                model: announcement,
                attributes: {
                    href: '#announcement/' + window.sessionStorage.courseId + '/' + announcement.get('id')
                }
            });

            this.$el.find('#ls-course-announcements')
                .append(announcementItemView.render().el);

            return this;
        }
    });

    return CourseAnnouncementsView;
});
