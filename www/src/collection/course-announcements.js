define([
    'backbone',
    'model/course-announcement'
], function (Backbone, CourseAnnouncementModel) {
    var CourseAnnouncementsCollection = Backbone.Collection.extend({
        model: CourseAnnouncementModel,
        fetch: function (options) {
            var self = this,
                deferred = new $.Deferred();

            $.post(options.campus.url + '/main/webservices/api/v2.php', {
                api_key: options.campus.apiKey,
                username: options.campus.username,
                action: 'course_announcements',
                course: options.courseId
            })
                .done(function (response) {
                    if (response.error) {
                        deferred.reject(response.message);

                        return;
                    }
                    
                    response.data.forEach(function (announcement) {
                        self.add(announcement);
                    });

                    deferred.resolve();
                })
                .fail(function () {
                    deferred.reject();
                });
                
            return deferred.promise();
        }
    });

    return CourseAnnouncementsCollection;
});
