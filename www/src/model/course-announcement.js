define([
    'backbone'
], function (Backbone) {
    var CourseAnnouncementModel = Backbone.Model.extend({
        defaults: {
            id: 0,
            title: '',
            creatorName: '',
            date: '',
            content: ''
        },
        fetch: function (options) {
            var self = this,
                deferred = new $.Deferred();

            $
                .ajax({
                    type: 'post',
                    data: {
                        action: 'course_announcement',
                        course: options.courseId,
                        announcement: options.announcementId
                    },
                    success: function (response) {
                        if (response.error) {
                            deferred.reject(response.message);

                            return;
                        }

                        self.set(response.data);

                        deferred.resolve();
                    },
                    error: function () {
                        deferred.reject();
                    }
                });

            return deferred.promise();
        }
    });

    return CourseAnnouncementModel;
});
