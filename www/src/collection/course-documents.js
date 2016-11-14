define([
    'backbone',
    'model/course-document'
], function (Backbone, CourseDocumentModel) {
    var CourseDocumentsCollection = Backbone.Collection.extend({
        model: CourseDocumentModel,
        fetch: function (options) {
            var self = this,
                deferred = new $.Deferred();
            
            $
                .ajax({
                    type: 'post',
                    data: {
                        action: 'course_documents',
                        course: options.courseId,
                        dir_id: options.directoryId
                    },
                    success: function (response) {
                        if (response.error) {
                            deferred.reject(response.message);

                            return;
                        }

                        response.data
                            .forEach(function (document) {
                                self.add(document);
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

    return CourseDocumentsCollection;
});

