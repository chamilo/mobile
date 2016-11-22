define([
    'backbone',
    'model/course-notebook'
], function (Backbone, CourseNotebookModel) {
    var CourseNotebooksCollection = Backbone.Collection.extend({
        model: CourseNotebookModel,
        fetch: function () {
            var self = this,
                deferred = new $.Deferred();

            $
                .ajax({
                    type: 'post',
                    data: {
                        action: 'course_notebooks'
                    },
                    success: function (response) {
                        if (response.error) {
                            deferred.reject(response.message);

                            return;
                        }

                        response.data.forEach(function (notebook) {
                                self.add(notebook);
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

    return CourseNotebooksCollection;
});

