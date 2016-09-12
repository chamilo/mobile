define([
    'backbone',
    'model/course-document'
], function (Backbone, CourseDocumentModel) {
    var CourseDocumentsCollection = Backbone.Collection.extend({
        model: CourseDocumentModel,
        fetch: function (options) {
            var self = this,
                deferred = new $.Deferred();

            $.post(options.campus.url + '/main/webservices/api/v2.php', {
                api_key: options.campus.apiKey,
                username: options.campus.username,
                action: 'course_documents',
                course: options.courseId,
                dir_id: options.directoryId
            })
                .done(function (response) {
                    if (response.error) {
                        deferred.reject(response.message);

                        return;
                    }

                    response.data.forEach(function (document) {
                        self.add(document);
                    });

                    deferred.resolve();
                })
                .fail(function () {
                    deferred.reject();
                });

            return deferred.promise();
        }
    });

    return CourseDocumentsCollection;
});

