define([
    'backbone',
    'model/course-lpcategory'
], function (Backbone, CourseLpCategoryModel) {
    var CourseLpCategoriesCollection = Backbone.Collection.extend({
        model: CourseLpCategoryModel,
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
                        action: 'course_learnpaths',
                        course: this.courseId
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

