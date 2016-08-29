define([
    'backbone',
    'model/course-forumcategory'
], function (Backbone, CourseForumCategoryModel) {
    var CourseForumCategoriesCollection = Backbone.Collection.extend({
        model: CourseForumCategoryModel,
        fetch: function (options) {
            var self = this,
                deferred = new $.Deferred();

            $.post(options.campus.url + '/main/webservices/api/v2.php', {
                api_key: options.campus.apiKey,
                username: options.campus.username,
                action: 'course_forumcategories',
                c_id: options.courseId
            })
                .done(function (response) {
                    if (response.error) {
                        deferred.reject(response.message);

                        return;
                    }

                    response.data.forEach(function (forumcategory) {
                        self.add(forumcategory);
                    });

                    deferred.resolve();
                })
                .fail(function () {
                    deferred.reject();
                });

            return deferred.promise();
        }
    });

    return CourseForumCategoriesCollection;
});

