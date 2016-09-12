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

            options = $.extend({
                request: {
                    username: '',
                    baseUrl: '',
                    apiKey: ''
                }
            }, options);

            $.post(options.request.baseUrl + '/main/webservices/api/v2.php', {
                api_key: options.request.apiKey,
                username: options.request.username,
                action: 'course_info',
                course: this.cid
            }, function (response) {
                if (response.error) {
                    deferred.reject(response.message);

                    return;
                }

                self.set(response.data);

                deferred.resolve();
            });

            return deferred.promise();
        }
    });

    return CourseModel;
});
