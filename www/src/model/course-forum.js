define([
    'backbone'
], function (Backbone) {
    var CourseForumModel = Backbone.Model.extend({
        defaults: {
            id: 0,
            title: '',
            description: '',
            image: '',
            threads: []
        },
        fetch: function (options) {
            var self = this,
                deferred = new $.Deferred();

            $
                .ajax({
                    type: 'post',
                    data: {
                        action: 'course_forum',
                        course: window.sessionStorage.getItem('courseId'),
                        forum: options.forumId
                    },
                    success: function (response) {
                        if (response.error) {
                            deferred.reject(response.message);

                            return;
                        }

                        self.set(response.data);
                        deferred.resolve();
                    },
                    error: function () {
                        deferred.reject();
                    }
                });

            return deferred.promise();
        }
    });

    return CourseForumModel;
});
