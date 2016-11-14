define([
    'backbone',
    'model/course-announcement'
], function (Backbone, CourseAnnouncementModel) {
    var CourseAnnouncementsCollection = Backbone.Collection.extend({
        model: CourseAnnouncementModel,
        fetch: function (options) {
            var self = this,
                deferred = new $.Deferred();

            $
                .ajax({
                    type: 'post',
                    data: {
                        action: 'course_announcements',
                        course: options.courseId
                    },
                    success: function (response) {
                        if (response.error) {
                            deferred.reject(response.message);

                            return;
                        }

                        response.data
                            .forEach(function (announcement) {
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
