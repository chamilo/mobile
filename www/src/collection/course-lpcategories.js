define([
    'backbone',
    'model/course-lpcategory'
], function (Backbone, CourseLpCategoryModel) {
    var CourseLpCategoriesCollection = Backbone.Collection.extend({
        model: CourseLpCategoryModel,
        fetch: function () {
            var self = this,
                deferred = new $.Deferred();

            $.ajax({
                type: 'post',
                data: {
                    action: 'course_learnpaths'
                },
                success: function (response) {
                    if (response.error) {
                        deferred.reject(response.message);

                        return;
                    }

                    response.data
                        .forEach(function (lpCategoryData) {
                            if (!lpCategoryData.learnpaths.length) {
                                return;
                            }

                            var lpCategory = new CourseLpCategoryModel(lpCategoryData);
                            lpCategory.id = lpCategoryData.id;

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

