define([
    'backbone',
    'model/course'
], function (Backbone, CourseModel) {
    var CoursesCollection = Backbone.Collection.extend({
        model: CourseModel,
        fetch: function () {
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

                    response.data
                        .forEach(function (courseData) {
                            var course = new CourseModel(courseData);
                            course.id = courseData.id;

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