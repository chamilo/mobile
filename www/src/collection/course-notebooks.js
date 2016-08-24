define([
    'backbone',
    'model/course-notebook'
], function (Backbone, CourseNotebookModel) {
    var CourseNotebooksCollection = Backbone.Collection.extend({
        model: CourseNotebookModel,
        fetch: function (options) {
            var self = this,
                deferred = new $.Deferred();

            $.post(options.campus.url + '/main/webservices/api/v2.php', {
                api_key: options.campus.apiKey,
                username: options.campus.username,
                action: 'course_notebooks',
                c_id: options.courseId
            })
                .done(function (response) {
                    if (response.error) {
                        deferred.reject(response.message);

                        return;
                    }

                    response.data.forEach(function (notebook) {
                        self.add(notebook);
                    });

                    deferred.resolve();
                })
                .fail(function () {
                    deferred.reject();
                });

            return deferred.promise();
        }
    });

    return CourseNotebooksCollection;
});

