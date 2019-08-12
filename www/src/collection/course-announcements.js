define([
    'backbone',
    'model/course-announcement'
], function (Backbone, CourseAnnouncementModel) {
    var CourseAnnouncementsCollection = Backbone.Collection.extend({
        model: CourseAnnouncementModel,
        fetch: function () {
            var self = this,
                deferred = new $.Deferred();

            $.ajax({
                type: 'post',
                data: {
                    action: 'course_announcements'
                },
                success: function (response) {
                    if (response.error) {
                        deferred.reject(response.message);

                        return;
                    }

                    response.data
                        .forEach(function (announcementData) {
                            var announcement = new CourseAnnouncementModel(announcementData);
                            announcement.id = announcementData.id;

                            self.add(announcement);
                        });

                    deferred.resolve();
                },
                error: function () {
                    deferred.reject();
                }
            });

            return deferred.promise();
        }
    });

    return CourseAnnouncementsCollection;
});
