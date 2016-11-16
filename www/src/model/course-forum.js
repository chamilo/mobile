define([
    'backbone'
], function (Backbone) {
    var CourseForumModel = Backbone.Model.extend({
        courseId: 0,
        defaults: {
            id: 0,
            title: '',
            description: '',
            image: '',
            threads: []
        },
        initialize: function () {
            this.id = parseInt(window.sessionStorage.forumId);
            this.courseId = parseInt(window.sessionStorage.courseId);
        },
        fetch: function () {
            var self = this,
                deferred = new $.Deferred();

            $.ajax({
                type: 'post',
                data: {
                    action: 'course_forum',
                    course: this.courseId,
                    forum: this.id
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
