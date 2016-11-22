define([
    'backbone',
    'model/course-document'
], function (Backbone, CourseDocumentModel) {
    var CourseDocumentsCollection = Backbone.Collection.extend({
        model: CourseDocumentModel,
        directoryId: 0,
        initialize: function () {
            this.directoryId = parseInt(window.sessionStorage.directoryId);
        },
        fetch: function () {
            var self = this,
                deferred = new $.Deferred();

            $
                .ajax({
                    type: 'post',
                    data: {
                        action: 'course_documents',
                        dir_id: this.directoryId
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

