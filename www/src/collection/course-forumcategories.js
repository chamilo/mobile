define([
    'backbone',
    'model/course-forumcategory'
], function (Backbone, CourseForumCategoryModel) {
    var CourseForumCategoriesCollection = Backbone.Collection.extend({
        model: CourseForumCategoryModel,
        fetch: function () {
            var self = this,
                deferred = new $.Deferred();
            
            $.ajax({
                type: 'post',
                data: {
                    action: 'course_forumcategories'
                },
                success: function (response) {
                    if (response.error) {
                        deferred.reject(response.message);

                        return;
                    }

                    response.data.forEach(function (forumcategory) {
                            self.add(forumcategory);
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

    return CourseForumCategoriesCollection;
});

