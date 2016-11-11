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

            $.ajax({
                type: 'post',
                data: {
                    action: 'user_courses'
                },
                success: function (response) {
                    if (response.error) {
                        deferred.reject(response.message);

                        return;
                    }

                    response.data.forEach(function (course) {
                        self.add(course);
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

    return CoursesCollection;
});