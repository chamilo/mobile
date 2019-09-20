define([
    'backbone'
], function (Backbone) {
    var CourseModel = Backbone.Model.extend({
        defaults: {
            id: 0,
            title: '',
            code: '',
            directory: '',
            urlPicture: null,
            teachers: '',
            isSpecial: false,
            tools: [
                {type: 'description'},
                {type: 'documents'},
                {type: 'learning_paths'},
                {type: 'forum'},
                {type: 'agenda'},
                {type: 'notebook'},
                {type: 'announcements'}
            ]
        },
        fetch: function (options) {
            var self = this,
                deferred = new $.Deferred();

            $.ajax({
                type: 'post',
                data: {
                    action: 'course_info'
                },
                success: function (response) {
                    if (response.error) {
                        deferred.reject(response.message);

                        return;
                    }

                    self.cid = response.data.id;
                    self.id = response.data.id;
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

    return CourseModel;
});
