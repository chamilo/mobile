define([
    'backbone',
    'model/course-lpcategory'
], function (Backbone, CourseLpCategoryModel) {
    var CourseLpCategoriesCollection = Backbone.Collection.extend({
        model: CourseLpCategoryModel,
        fetch: function (options) {
            var self = this,
                deferred = new $.Deferred();

            $.post(options.campus.url + '/main/webservices/api/v2.php', {
                api_key: options.campus.apiKey,
                username: options.campus.username,
                action: 'course_learnpaths',
                c_id: options.courseId
            })
                .done(function (response) {
                    if (response.error) {
                        deferred.reject(response.message);

                        return;
                    }

                    response.data.forEach(function (lpCategory) {
                        self.add(lpCategory);
                    });

                    deferred.resolve();
                })
                .fail(function () {
                    deferred.reject();
                });

            return deferred.promise();
        }
    });

    return CourseLpCategoriesCollection;
});

