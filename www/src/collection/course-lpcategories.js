define([
    'backbone',
    'model/course-lpcategory'
], function (Backbone, CourseLpCategoryModel) {
    var CourseLpCategoriesCollection = Backbone.Collection.extend({
        model: CourseLpCategoryModel,
        fetch: function (options) {
            var self = this,
                deferred = new $.Deferred();

            $
                .ajax({
                    type: 'post',
                    data: {
                        action: 'course_learnpaths',
                        course: options.courseId
                    },
                    success: function (response) {
                        if (response.error) {
                            deferred.reject(response.message);

                            return;
                        }

                        response.data
                            .forEach(function (lpCategory) {
                                if (!lpCategory.learnpaths.length) {
                                    return;
                                }

                                self.add(lpCategory);
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

    return CourseLpCategoriesCollection;
});

