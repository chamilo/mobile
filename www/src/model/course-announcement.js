define([
    'backbone'
], function (Backbone) {
    var CourseAnnouncementModel = Backbone.Model.extend({
        courseId: 0,
        defaults: {
            id: 0,
            title: '',
            creatorName: '',
            date: '',
            content: ''
        },
        initialize: function () {
            this.courseId = parseInt(window.sessionStorage.courseId);
            this.id = parseInt(window.sessionStorage.announcementId);
        },
        fetch: function () {
            var self = this,
                deferred = new $.Deferred();

            $
                .ajax({
                    type: 'post',
                    data: {
                        action: 'course_announcement',
                        course: this.courseId,
                        announcement: this.id
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
