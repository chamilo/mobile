define([
    'backbone',
    'model/course-forumpost'
], function (Backbone, CourseForumPostModel) {
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

                    self.set({
                        id: response.data.id,
                        cId: response.data.cId,
                        forumId: response.data.forumId,
                        title: response.data.title
                    });

                    var posts = [];

                    _.each(response.data.posts, function (postData) {
                        var forumPost = new CourseForumPostModel(postData);
                        forumPost.set({
                            threadId: self.get('id'),
                            forumId: self.get('forumId')
                        });

                        posts.push(forumPost);
                    });

                    self.set('posts', posts);

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
