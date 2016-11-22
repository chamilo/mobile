define([
    'backbone',
    'model/course-forumpost'
], function (Backbone, CourseForumPostModel) {
    var CourseForumThreadModel = Backbone.Model.extend({
        forumId: 0,
        defaults: {
            id: 0,
            cId: 0,
            title: '',
            forumId: 0,
            posts: []
        },
        initialize: function () {
            this.forumId = parseInt(window.sessionStorage.forumId);
            this.id = parseInt(window.sessionStorage.threadId);
        },
        fetch: function () {
            var self = this,
                deferred = new $.Deferred;

            $
                .ajax({
                    type: 'post',
                    data: {
                        action: 'course_forumthread',
                        thread: this.id,
                        forum: this.forumId
                    },
                    success: function (response) {
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
                            postData.threadId = self.get('id');
                            postData.forumId = self.get('forumId');

                            var forumPost = new CourseForumPostModel(postData);

                            posts.push(forumPost);
                        });

                        self.set('posts', posts);

                        deferred.resolve();
                    },
                    error: function () {
                        deferred.reject();
                    }
                });

            return deferred.promise();
        }
    });

    return CourseForumThreadModel;
});
