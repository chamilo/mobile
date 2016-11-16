define([
    'backbone',
    'model/course-notebook'
], function (Backbone, CourseNotebookModel) {
    var CourseNotebooksCollection = Backbone.Collection.extend({
        model: CourseNotebookModel,
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
                        action: 'course_notebooks',
                        course: this.courseId
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

