define([
    'backbone',
    'model/course-event'
], function (Backbone, CourseEventModel) {
    var CourseEventsCollection = Backbone.Collection.extend({
        model: CourseEventModel,
        courseId: 0,
        initialize: function () {
            this.courseId = parseInt(window.sessionStorage.courseId);
        },
        fetch: function () {
            var self = this,
                deferred = new $.Deferred();

            $
                .ajax({
                    type: 'post',
                    data: {
                        action: 'course_agenda',
                        course: this.courseId
                    },
                    success: function (response) {
                        if (response.error) {
                            deferred.reject(response.message);

                            return;
                        }

                        response.data
                            .forEach(function (event) {
                                self.add(event);
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

    return CourseEventsCollection;
});
