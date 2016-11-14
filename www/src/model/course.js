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
            teachers: ''
        },
        fetch: function (options) {
            var self = this,
                deferred = new $.Deferred();

            $
                .ajax({
                    type: 'post',
                    data: {
                        action: 'course_info',
                        course: this.cid
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

    return CourseModel;
});
