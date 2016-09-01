define([
    'backbone'
], function (Backbone) {
    var CourseForumThreadModel = Backbone.Model.extend({
        defaults: {
            id: 0,
            cId: 0,
            title: '',
            forumId: 0,
            posts: []
        },
        fetch: function (options) {
            var self = this,
                deferred = new $.Deferred;

            $.post(options.campus.url + '/main/webservices/api/v2.php', {
                username: options.campus.username,
                api_key: options.campus.apiKey,
                action: 'course_forumthread',
                thread: options.threadId
            })
                .done(function (response) {
                    if (response.error) {
                        deferred.reject(response.message);

                        return;
                    }

                    self.set(response.data);

                    deferred.resolve();
                })
                .fail(function () {
                    deferred.reject();
                });

            return deferred.promise();
        }
    });

    return CourseForumThreadModel;
});
