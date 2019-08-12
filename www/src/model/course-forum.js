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
        initialize: function () {
            this.id = parseInt(window.sessionStorage.forumId);
        },
        fetch: function () {
            var self = this,
                deferred = new $.Deferred();

            $.ajax({
                type: 'post',
                data: {
                    action: 'course_forum',
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
