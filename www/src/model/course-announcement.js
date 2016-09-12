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

            $.post(options.campus.url + '/main/webservices/api/v2.php', {
                api_key: options.campus.apiKey,
                username: options.campus.username,
                action: 'course_announcement',
                course: options.courseId,
                announcement: options.announcementId
            })
                .done(function (response) {
                    if (response.error) {
                        deferred.reject(response.message);

                        return;
                    }

                    self.set(response.data);

                    deferred.resolve();
                })
                .fail(function () {
                    deferred.reject();
                });

            return deferred.promise();
        }
    });

    return CourseAnnouncementModel;
});
