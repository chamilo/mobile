define([
    'backbone',
    'model/course-description'
], function (Backbone, CourseDescriptionModel) {
    var CourseDescriptionsCollection = Backbone.Collection.extend({
        model: CourseDescriptionModel,
        fetch: function (options) {
            var self = this,
                deferred = new $.Deferred();
            
            $
                .ajax({
                    type: 'post',
                    data: {
                        action: 'course_descriptions',
                        course: options.courseId
                    },
                    success: function (response) {
                        if (response.error) {
                            deferred.reject(response.message);

                            return;
                        }

                        response.data
                            .forEach(function (description) {
                                self.add(description);
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

    return CourseDescriptionsCollection;
});

