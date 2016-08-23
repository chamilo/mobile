define([
    'backbone',
    'model/course-description'
], function (Backbone, CourseDescriptionModel) {
    var CourseDescriptionsCollection = Backbone.Collection.extend({
        model: CourseDescriptionModel,
        fetch: function (options) {
            var self = this,
                deferred = new $.Deferred();

            $.post(options.campus.url + '/main/webservices/api/v2.php', {
                api_key: options.campus.apiKey,
                username: options.campus.username,
                action: 'course_descriptions',
                c_id: options.courseId
            })
                .done(function (response) {
                    if (response.error) {
                        deferred.reject(response.message);

                        return;
                    }

                    response.data.forEach(function (description) {
                        self.add(description);
                    });

                    deferred.resolve();
                })
                .fail(function () {
                    deferred.reject();
                });

            return deferred.promise();
        }
    });

    return CourseDescriptionsCollection;
});

