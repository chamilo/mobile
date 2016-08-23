define([
    'backbone',
    'model/course'
], function (Backbone, CourseModel) {
    var campus = null;

    var CoursesCollection = Backbone.Collection.extend({
        model: CourseModel,
        initialize: function (models, options) {
            options = $.extend({
                campus: {
                    username: '',
                    url: '',
                    apiKey: ''
                }
            }, options);

            campus = options.campus;
        },
        fetch: function (options) {
            var self = this,
                deferred = new $.Deferred();

            $
                .post(campus.url + '/main/webservices/api/v2.php', {
                    action: 'user_courses',
                    api_key: campus.apiKey,
                    username: campus.username
                })
                .done(function (response) {
                    if (response.error) {
                        deferred.reject(response.message);

                        return;
                    }

                    response.data.forEach(function (course) {
                        self.add(course);
                    });

                    deferred.resolve();
                })
                .fail(function () {
                    deferred.reject();
                });

            return deferred.promise();
        }
    });

    return CoursesCollection;
});