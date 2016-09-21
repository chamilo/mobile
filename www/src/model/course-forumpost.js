define([
    'backbone'
], function (Backbone) {
    var CourseForumPostModel = Backbone.Model.extend({
        defaults: {
            id: 0,
            title: '',
            text: '',
            author: '',
            date: '',
            parentId: 0,
            threadId: 0,
            forumId: 0
        },
        save: function (attributes, options) {
            var deferred = new $.Deferred;

            $.post(options.campus.url + '/main/webservices/api/v2.php', {
                username: options.campus.username,
                api_key: options.campus.apiKey,
                action: 'save_forum_post',
                title: attributes.title,
                text: attributes.text,
                thread: attributes.threadId,
                forum: attributes.forumId,
                notify: options.notify ? 1 : 0,
                parent: attributes.parentId,
                course: options.courseId
            })
                .done(function (response) {
                    if (response.error) {
                        deferred.reject(response.message);

                        return;
                    }

                    deferred.resolve();
                })
                .fail(function () {
                    deferred.reject();
                });

            return deferred.promise();
        }
    });

    return CourseForumPostModel;
});
